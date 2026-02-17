/**
 * Orchestrator — DAG execution engine with A2A handoff.
 *
 * Receives an authorized PlanLock and executes tasks respecting the dependency DAG.
 * Spawns Builder agents in parallel for independent tasks.
 * Builder → Verifier handoff on task completion.
 * Explainer runs after all tasks are verified.
 * Emits run status events for SignalR dashboard updates.
 *
 * Hybrid: in-memory RunState for hot execution + Cosmos DB for persistence.
 */

import { SigmaRouter } from "@blueflame/foundry";
import type { RoutingDecision } from "@blueflame/foundry";
import type {
	ActionEvent,
	AgentState,
	DeploymentState,
	PendingFix,
	PlanLock,
	TaskPatch,
	TaskPlan,
} from "@blueflame/shared";
import {
	AgentRole,
	AgentStatus,
	FailureSource,
	FailureType,
	RunStatus,
	TaskStatus,
} from "@blueflame/shared";
import type { Result } from "@blueflame/shared";
import { db } from "../db.js";
import {
	getAgent,
	getRunTotalCost,
	recordAgentUsage,
	spawnAgent,
	updateAgentStatus,
} from "./agent-spawner.js";
import { logAuditEvent } from "./audit-logger.js";
import { checkBudget as checkBudgetThresholds, initBudget } from "./budget-monitor.js";
import { recordCost } from "./cost-tracker.js";
import { allTasksTerminal, getReadyTasks, hasFailedTasks } from "./dag-executor.js";
import { storeFailure } from "./failure-store.js";
import { createHealingProject, shouldAutoHeal } from "./healing-engine.js";
import { extractPatternsFromRun } from "./knowledge-store.js";
import { incrementProjectStat } from "./spec-generation.js";
import { executeTask } from "./task-executor.js";

/** Shared σ-router instance */
const router = new SigmaRouter();

/** Routing decision log for transparency/audit (NOT attribution) */
const routingLog: RoutingDecision[] = [];

/** Get routing log entries for a given run (for transparency) */
export function getRoutingLog(): ReadonlyArray<RoutingDecision> {
	return routingLog;
}

/** Clear routing log (for testing) */
export function clearRoutingLog(): void {
	routingLog.length = 0;
}

/** Output stored per task (generated files, errors) */
export interface TaskOutput {
	files: Array<{ path: string; content: string; action: string }>;
	error?: string;
	commitMessage?: string;
}

/** Run state tracked by orchestrator */
export interface RunState {
	runId: string;
	projectId: string;
	lockId: string;
	status: RunStatus;
	plan: TaskPlan;
	lock: PlanLock;
	startedAt: string;
	completedAt: string | null;
	interruptRequested: boolean;
	events: ActionEvent[];
	pendingFixes: PendingFix[];
	retryCountByTask: Record<string, number>;
	taskOutputs: Record<string, TaskOutput>;
	deploymentState?: DeploymentState;
}

let eventCounter = 0;

function pushEvent(run: RunState, agentId: string, role: string, action: string, detail: string) {
	eventCounter += 1;
	run.events.push({
		id: `evt-${run.runId}-${eventCounter}`,
		runId: run.runId,
		timestamp: new Date().toISOString(),
		agentId,
		role,
		action,
		detail,
	});
}

/**
 * Push an event to a run from outside the orchestrator (e.g., task-executor).
 */
export function pushEventExternal(
	runId: string,
	agentId: string,
	role: string,
	action: string,
	detail: string,
): void {
	const run = runs.get(runId);
	if (run) {
		pushEvent(run, agentId, role, action, detail);
	}
}

/**
 * Store task output (generated files, errors) for a given task.
 */
export function setTaskOutput(runId: string, taskId: string, output: TaskOutput): void {
	const run = runs.get(runId);
	if (run) {
		run.taskOutputs[taskId] = output;
	}
}

/**
 * Update deployment state for a run (used by deployment-service).
 */
export function updateDeploymentState(runId: string, state: DeploymentState): void {
	const run = runs.get(runId);
	if (run) {
		run.deploymentState = state;
		checkpointRun(run);
	}
}

/** In-memory run store — hot state for active runs */
const runs = new Map<string, RunState>();

/**
 * Checkpoint run state to Cosmos DB for persistence across restarts.
 * Stores as a document in the "documents" container.
 */
function checkpointRun(run: RunState): void {
	const doc = {
		...run,
		id: `runstate-${run.runId}`,
		projectId: run.projectId,
		type: "run-state",
	};
	db.documents
		.upsert(doc as never, run.projectId)
		.catch((err) => console.error("[orchestrator] Cosmos checkpoint failed:", err));
}

/** Callback for run status changes (wired to SignalR) */
export type RunStatusCallback = (runId: string, status: RunStatus) => void;

let statusCallback: RunStatusCallback | null = null;

/** Callback for budget alerts */
export type BudgetAlertCallback = (
	runId: string,
	currentSpend: number,
	ceiling: number,
	percentUsed: number,
) => void;

let budgetCallback: BudgetAlertCallback | null = null;

/**
 * Register callbacks for orchestrator events.
 */
export function onRunStatusChange(callback: RunStatusCallback): void {
	statusCallback = callback;
}

export function onBudgetAlert(callback: BudgetAlertCallback): void {
	budgetCallback = callback;
}

/**
 * Start execution of an authorized plan.
 */
export async function startExecution(plan: TaskPlan, lock: PlanLock): Promise<Result<RunState>> {
	if (runs.has(plan.runId)) {
		return { ok: false, error: new Error(`Run ${plan.runId} already exists`) };
	}

	const runState: RunState = {
		runId: plan.runId,
		projectId: plan.projectId,
		lockId: lock.lockId,
		status: RunStatus.Executing,
		plan: { ...plan, tasks: plan.tasks.map((t) => ({ ...t })) },
		lock,
		startedAt: new Date().toISOString(),
		completedAt: null,
		interruptRequested: false,
		events: [],
		pendingFixes: [],
		retryCountByTask: {},
		taskOutputs: {},
	};

	runs.set(plan.runId, runState);
	checkpointRun(runState);

	// Auto-init budget with default ceiling based on estimated task costs
	const estimatedCeiling = plan.tasks.reduce((sum, t) => sum + (t.estimatedCost ?? 0.1), 0) * 3;
	initBudget(plan.runId, Math.max(estimatedCeiling, 5.0), plan.projectId);

	// Increment project runCount
	incrementProjectStat(plan.projectId, "runCount").catch((err) =>
		console.error("[Orchestrator] Failed to increment runCount:", err),
	);

	pushEvent(
		runState,
		"orchestrator",
		"SYSTEM",
		"RUN_STARTED",
		`Execution started for run ${plan.runId}`,
	);
	logAuditEvent({
		eventType: "AUTH",
		actor: "orchestrator",
		action: "run.start",
		resource: plan.runId,
		outcome: "ALLOWED",
		details: `Execution started with ${plan.tasks.length} tasks`,
		runId: plan.runId,
		projectId: plan.projectId,
	}).catch(() => {});
	notifyStatusChange(plan.runId, RunStatus.Executing);

	// Auto-advance: kick off the first wave of ready tasks
	const waveResult = await executeNextWave(plan.runId);
	if (!waveResult.ok) {
		console.error("[Orchestrator] First wave failed:", waveResult.error.message);
	}

	return { ok: true, value: runState };
}

/**
 * Execute the next wave of ready tasks.
 * Returns the spawned agents for the tasks.
 */
export async function executeNextWave(runId: string): Promise<Result<AgentState[]>> {
	const run = await getRun(runId);
	if (!run) {
		return { ok: false, error: new Error(`Run not found: ${runId}`) };
	}

	if (run.interruptRequested) {
		return pauseRun(runId);
	}

	// Budget check
	const budgetResult = checkBudget(run);
	if (!budgetResult.ok) {
		return budgetResult;
	}
	// If budget check paused the run, return early
	if (run.status === RunStatus.Paused) {
		return { ok: true, value: [] };
	}

	// Transition AUTHORIZED → EXECUTING when starting/resuming
	if (run.status === RunStatus.Authorized) {
		run.status = RunStatus.Executing;
		pushEvent(run, "orchestrator", "SYSTEM", "RUN_RESUMED", "Execution started by user");
		checkpointRun(run);
		notifyStatusChange(runId, RunStatus.Executing);
	}

	const readyTasks = getReadyTasks(run.plan.tasks);

	if (readyTasks.length === 0) {
		if (allTasksTerminal(run.plan.tasks)) {
			completeRun(run);
		}
		return { ok: true, value: [] };
	}

	const spawnedAgents: AgentState[] = [];

	for (const task of readyTasks) {
		// Re-check interrupt between task spawns in the same wave
		if (run.interruptRequested) {
			return pauseRun(runId);
		}

		// σ-routing: select model based on task sigma estimate
		const decision = router.route(task.agentRole, task.sigmaEstimate);
		routingLog.push(decision);
		const model = decision.model;
		const agent = await spawnAgent(runId, task.agentRole, task.id, model);

		// Mark task as running
		task.status = TaskStatus.Running;

		// Mark agent as executing
		await updateAgentStatus(agent.agentId, AgentStatus.Executing);

		pushEvent(
			run,
			agent.agentId,
			task.agentRole,
			"AGENT_SPAWNED",
			`${task.agentRole} agent spawned for task ${task.id} (model: ${model})`,
		);
		pushEvent(run, agent.agentId, task.agentRole, "TASK_STARTED", `Task ${task.id} started`);

		spawnedAgents.push(agent);

		// Fire-and-forget: actually execute the task via LLM
		executeTask(run, task, agent).catch((err) => {
			console.error(`[Orchestrator] Task execution failed for ${task.id}:`, err);
		});
	}

	return { ok: true, value: spawnedAgents };
}

/**
 * Complete a task and trigger A2A handoff.
 * Builder completion → spawn Verifier for the same task.
 */
export async function completeTask(
	runId: string,
	taskId: string,
	agentId: string,
	tokensUsed: number,
	costIncurred: number,
	sigmaValue?: number,
	/** Which agent role just completed (Builder, Verifier, etc.) */
	completingRole?: AgentRole,
): Promise<Result<{ verifierAgent?: AgentState }>> {
	const run = runs.get(runId);
	if (!run) {
		return { ok: false, error: new Error(`Run not found: ${runId}`) };
	}

	const task = run.plan.tasks.find((t) => t.id === taskId);
	if (!task) {
		return { ok: false, error: new Error(`Task not found: ${taskId}`) };
	}

	// Record usage + cost tracking + budget check
	await recordAgentUsage(agentId, tokensUsed, costIncurred, sigmaValue);
	await updateAgentStatus(agentId, AgentStatus.Completed);
	const agent = getAgent(agentId);
	if (agent) {
		recordCost(agentId, runId, agent.model, tokensUsed, Math.ceil(tokensUsed * 0.3), run.projectId);
		checkBudgetThresholds(runId);
	}

	// Use explicit completingRole if provided, otherwise fall back to task.agentRole
	const agentRole = completingRole ?? task.agentRole;

	// A2A handoff: Builder → Verifier (use task's σ for verifier routing)
	if (agentRole === AgentRole.Builder) {
		// Check if this was a fixer run — require user approval before verifying
		const pendingFix = run.pendingFixes.find((f) => f.taskId === taskId);
		if (pendingFix) {
			// Populate the fix with the fixer's output
			const fixerOutput = run.taskOutputs[taskId];
			pendingFix.fixedCode = fixerOutput?.files?.length
				? fixerOutput.files.map((f) => `// === ${f.path} ===\n${f.content}`).join("\n\n")
				: "(fixer produced no output)";
			pendingFix.explanation =
				fixerOutput?.commitMessage ?? "Fixer attempted to resolve verification failure";

			pushEvent(
				run,
				agentId,
				AgentRole.Builder,
				"FIX_PROPOSED",
				`Fixer proposed fix for task ${taskId} (retry ${pendingFix.retryCount}) — awaiting approval`,
			);
			checkpointRun(run);
			// Do NOT auto-spawn verifier — wait for user to approve/reject via UI
			return { ok: true, value: {} };
		}

		pushEvent(
			run,
			agentId,
			AgentRole.Builder,
			"TASK_COMPLETED",
			`Builder completed task ${taskId}, handing off to Verifier`,
		);

		// Check interrupt before spawning Verifier — stop immediately if requested
		if (run.interruptRequested) {
			task.status = TaskStatus.Completed;
			checkpointRun(run);
			pauseRun(runId);
			return { ok: true, value: {} };
		}

		const verifierDecision = router.route(AgentRole.Verifier, task.sigmaEstimate);
		routingLog.push(verifierDecision);
		const verifier = await spawnAgent(runId, AgentRole.Verifier, taskId, verifierDecision.model);
		await updateAgentStatus(verifier.agentId, AgentStatus.Executing);
		pushEvent(
			run,
			verifier.agentId,
			AgentRole.Verifier,
			"AGENT_SPAWNED",
			`Verifier spawned for task ${taskId}`,
		);

		// Fire-and-forget: execute verifier via LLM
		executeTask(run, task, verifier).catch((err) => {
			console.error(`[Orchestrator] Verifier execution failed for ${taskId}:`, err);
		});

		return { ok: true, value: { verifierAgent: verifier } };
	}

	// Non-Builder roles (Verifier, Explainer, Planner) → mark task completed
	task.status = TaskStatus.Completed;
	pushEvent(run, agentId, agentRole, "TASK_COMPLETED", `Task ${taskId} completed`);
	checkpointRun(run);

	// Auto-advance: try to execute next wave of ready tasks
	executeNextWave(runId).catch((err) => {
		console.error(`[Orchestrator] Auto-advance failed after task ${taskId}:`, err);
	});

	return { ok: true, value: {} };
}

/** Max retries for fixer loop */
const MAX_FIXER_RETRIES = 3;

/**
 * Fail a task. If it's a Verifier failure and retries remain, spawn a Fixer agent.
 */
export async function failTask(
	runId: string,
	taskId: string,
	agentId: string,
	tokensUsed: number,
	costIncurred: number,
	originalCode?: string,
	errorMessage?: string,
	/** Which agent role just failed (Builder, Verifier, etc.) */
	failingRole?: AgentRole,
): Promise<Result<{ fixerSpawned?: boolean }>> {
	const run = runs.get(runId);
	if (!run) {
		return { ok: false, error: new Error(`Run not found: ${runId}`) };
	}

	const task = run.plan.tasks.find((t) => t.id === taskId);
	if (!task) {
		return { ok: false, error: new Error(`Task not found: ${taskId}`) };
	}

	await recordAgentUsage(agentId, tokensUsed, costIncurred);
	await updateAgentStatus(agentId, AgentStatus.Failed);
	const failAgent = getAgent(agentId);
	if (failAgent) {
		recordCost(
			agentId,
			runId,
			failAgent.model,
			tokensUsed,
			Math.ceil(tokensUsed * 0.3),
			run.projectId,
		);
		checkBudgetThresholds(runId);
	}

	// Use explicit failingRole if provided, otherwise fall back to task.agentRole
	const agentRole = failingRole ?? task.agentRole;

	// Set failureReason on the task so the frontend can display it
	if (errorMessage) {
		task.failureReason = errorMessage;
	}

	// Record failure for Failure Intelligence dashboard
	const failId = `fail-${runId}-${taskId}-${Date.now()}`;
	storeFailure({
		id: failId,
		failureId: failId,
		runId,
		projectId: run.projectId,
		source: FailureSource.GitHubActions,
		pipelineId: `blueflame-${agentRole}`,
		buildNumber: `${taskId}-${Date.now()}`,
		failureType: agentRole === AgentRole.Verifier ? FailureType.Test : FailureType.Build,
		failedSteps: [
			{
				name: `${agentRole} — ${taskId}`,
				exitCode: 1,
				logExcerpt: (errorMessage ?? `${agentRole} failed`).slice(0, 2000),
				durationSeconds: 0,
			},
		],
		testResults: null,
		environment: { os: "blueflame", runtimeVersion: "1.0" },
		branchRef: `blueflame/${runId}`,
		commitSha: "",
		timestamp: new Date().toISOString(),
		rawLogUrl: "",
		ttl: 2592000,
	}).catch(() => {});

	// WF3 Fixer Loop: On Verifier failure, spawn Fixer if retries remain
	const retryCount = run.retryCountByTask[taskId] ?? 0;
	if (agentRole === AgentRole.Verifier && retryCount < MAX_FIXER_RETRIES) {
		// Check interrupt before spawning Fixer — stop immediately if requested
		if (run.interruptRequested) {
			task.status = TaskStatus.Failed;
			checkpointRun(run);
			pauseRun(runId);
			return { ok: true, value: { fixerSpawned: false } };
		}

		run.retryCountByTask[taskId] = retryCount + 1;

		// Spawn Fixer agent
		const fixerDecision = router.route(AgentRole.Builder, task.sigmaEstimate);
		routingLog.push(fixerDecision);
		const fixer = await spawnAgent(runId, AgentRole.Builder, taskId, fixerDecision.model);
		await updateAgentStatus(fixer.agentId, AgentStatus.Executing);

		const retryDetail = errorMessage
			? `Verifier failed task ${taskId}: ${errorMessage} (retry ${retryCount + 1}/${MAX_FIXER_RETRIES})`
			: `Verifier failed task ${taskId} (retry ${retryCount + 1}/${MAX_FIXER_RETRIES})`;
		pushEvent(run, agentId, AgentRole.Verifier, "TASK_FAILED", retryDetail);
		pushEvent(
			run,
			fixer.agentId,
			AgentRole.Builder,
			"AGENT_SPAWNED",
			`Fixer spawned for task ${taskId} (retry ${retryCount + 1})`,
		);

		// Create pending fix record (fixer output will be filled when fixer completes)
		const pendingFix: PendingFix = {
			taskId,
			fixerId: fixer.agentId,
			originalCode: originalCode ?? "",
			fixedCode: "",
			explanation: "",
			retryCount: retryCount + 1,
			createdAt: new Date().toISOString(),
		};
		run.pendingFixes.push(pendingFix);

		// Keep task in Running state (waiting for fixer)
		task.status = TaskStatus.Running;
		checkpointRun(run);

		// Fire-and-forget: execute fixer via LLM
		executeTask(run, task, fixer).catch((err) => {
			console.error(`[Orchestrator] Fixer execution failed for ${taskId}:`, err);
		});

		return { ok: true, value: { fixerSpawned: true } };
	}

	// No retries left or non-Verifier role — mark as failed permanently
	task.status = TaskStatus.Failed;

	// If a pending fix exists (fixer failed), populate it so UI stops showing "working..."
	const existingFix = run.pendingFixes.find((f) => f.taskId === taskId);
	if (existingFix && !existingFix.fixedCode) {
		existingFix.fixedCode = errorMessage
			? `Fixer failed: ${errorMessage}`
			: "(fixer could not produce a fix)";
		existingFix.explanation = errorMessage ?? "The fixer agent was unable to resolve this task";
	}

	const failDetail = errorMessage
		? `Task ${taskId} failed: ${errorMessage}`
		: `Task ${taskId} failed permanently`;
	pushEvent(run, agentId, agentRole, "TASK_FAILED", failDetail);
	checkpointRun(run);

	// Auto-advance: check if all tasks are terminal → complete the run
	executeNextWave(runId).catch((err) => {
		console.error(`[Orchestrator] Auto-advance failed after task ${taskId} failure:`, err);
	});

	return { ok: true, value: { fixerSpawned: false } };
}

/**
 * Submit a fixer's proposed fix for human approval.
 */
export function submitFix(
	runId: string,
	taskId: string,
	fixerId: string,
	fixedCode: string,
	explanation: string,
): Result<PendingFix> {
	const run = runs.get(runId);
	if (!run) {
		return { ok: false, error: new Error(`Run not found: ${runId}`) };
	}

	const fix = run.pendingFixes.find((f) => f.taskId === taskId && f.fixerId === fixerId);
	if (!fix) {
		return { ok: false, error: new Error(`Pending fix not found for task ${taskId}`) };
	}

	fix.fixedCode = fixedCode;
	fix.explanation = explanation;

	pushEvent(
		run,
		fixerId,
		AgentRole.Builder,
		"FIX_PROPOSED",
		`Fixer proposed fix for task ${taskId}: ${explanation}`,
	);
	checkpointRun(run);

	return { ok: true, value: fix };
}

/**
 * Approve a fixer's proposed fix — re-run Verifier on the fixed code.
 */
export async function approveFix(
	runId: string,
	taskId: string,
): Promise<Result<{ verifierAgent: AgentState }>> {
	const run = runs.get(runId);
	if (!run) {
		return { ok: false, error: new Error(`Run not found: ${runId}`) };
	}

	const task = run.plan.tasks.find((t) => t.id === taskId);
	if (!task) {
		return { ok: false, error: new Error(`Task not found: ${taskId}`) };
	}

	// Remove the pending fix
	const fixIndex = run.pendingFixes.findIndex((f) => f.taskId === taskId);
	if (fixIndex === -1) {
		return { ok: false, error: new Error(`No pending fix for task ${taskId}`) };
	}
	run.pendingFixes.splice(fixIndex, 1);

	// Re-spawn Verifier
	const verifierDecision = router.route(AgentRole.Verifier, task.sigmaEstimate);
	routingLog.push(verifierDecision);
	const verifier = await spawnAgent(runId, AgentRole.Verifier, taskId, verifierDecision.model);
	await updateAgentStatus(verifier.agentId, AgentStatus.Executing);

	pushEvent(
		run,
		"human",
		"HUMAN",
		"FIX_APPROVED",
		`Fix approved for task ${taskId}, re-running Verifier`,
	);
	pushEvent(
		run,
		verifier.agentId,
		AgentRole.Verifier,
		"AGENT_SPAWNED",
		`Verifier re-spawned for task ${taskId}`,
	);
	checkpointRun(run);

	// Fire-and-forget: execute verifier via LLM
	executeTask(run, task, verifier).catch((err) => {
		console.error(`[Orchestrator] Verifier re-execution failed for ${taskId}:`, err);
	});

	return { ok: true, value: { verifierAgent: verifier } };
}

/**
 * Reject a fixer's proposed fix — mark task as permanently failed.
 */
export function rejectFix(runId: string, taskId: string): Result<void> {
	const run = runs.get(runId);
	if (!run) {
		return { ok: false, error: new Error(`Run not found: ${runId}`) };
	}

	const task = run.plan.tasks.find((t) => t.id === taskId);
	if (!task) {
		return { ok: false, error: new Error(`Task not found: ${taskId}`) };
	}

	// Remove the pending fix
	const fixIndex = run.pendingFixes.findIndex((f) => f.taskId === taskId);
	if (fixIndex !== -1) {
		run.pendingFixes.splice(fixIndex, 1);
	}

	task.status = TaskStatus.Failed;
	pushEvent(
		run,
		"human",
		"HUMAN",
		"FIX_REJECTED",
		`Fix rejected for task ${taskId}, marking as failed`,
	);
	checkpointRun(run);

	return { ok: true, value: undefined };
}

/**
 * Request interruption of a run (user stop).
 * If all tasks are already terminal, force-completes the run immediately.
 * If tasks are still RUNNING with no pending waves, force-fails them and completes.
 */
export function requestInterrupt(runId: string): Result<void> {
	const run = runs.get(runId);
	if (!run) {
		return { ok: false, error: new Error(`Run not found: ${runId}`) };
	}

	if (run.status !== RunStatus.Executing) {
		return { ok: false, error: new Error(`Run is not executing (status: ${run.status})`) };
	}

	run.interruptRequested = true;

	// Force-complete if all tasks are already terminal (stuck run)
	if (allTasksTerminal(run.plan.tasks)) {
		completeRun(run);
		return { ok: true, value: undefined };
	}

	// Force-fail any RUNNING tasks that have no active agent processing them,
	// then complete the run if everything is now terminal
	const runningTasks = run.plan.tasks.filter((t) => t.status === TaskStatus.Running);
	const pendingTasks = run.plan.tasks.filter((t) => t.status === TaskStatus.Pending);

	if (runningTasks.length > 0 || pendingTasks.length > 0) {
		for (const task of runningTasks) {
			task.status = TaskStatus.Failed;
			task.failureReason = task.failureReason || "Execution stopped by user";
			pushEvent(
				run,
				"orchestrator",
				"SYSTEM",
				"TASK_FAILED",
				`Task ${task.id} force-stopped by user`,
			);
		}
		for (const task of pendingTasks) {
			task.status = TaskStatus.Deferred;
		}
		completeRun(run);
	}

	return { ok: true, value: undefined };
}

/**
 * Get run state. Falls back to Cosmos on cache miss.
 */
export async function getRun(runId: string): Promise<RunState | undefined> {
	const cached = runs.get(runId);
	if (cached) return cached;

	// Try loading from Cosmos
	try {
		const docs = await db.documents.queryAll({
			query: "SELECT * FROM c WHERE c.id = @id AND c.type = 'run-state'",
			parameters: [{ name: "@id", value: `runstate-${runId}` }],
		});
		if (docs.length > 0) {
			const run = docs[0] as unknown as RunState;
			runs.set(runId, run);
			return run;
		}
	} catch {
		// Cosmos unavailable
	}
	return undefined;
}

/**
 * Get all runs for a project (from in-memory cache + Cosmos fallback).
 * Returns lightweight summaries sorted newest-first.
 */
export async function getRunsByProject(projectId: string): Promise<RunState[]> {
	// Collect from in-memory cache first
	const results: RunState[] = [];
	for (const run of runs.values()) {
		if (run.projectId === projectId) {
			results.push(run);
		}
	}

	// Fallback: also check Cosmos for runs not in memory
	try {
		const docs = await db.documents.queryAll({
			query:
				"SELECT * FROM c WHERE c.projectId = @pid AND c.type = 'run-state' ORDER BY c.startedAt DESC",
			parameters: [{ name: "@pid", value: projectId }],
		});
		const cachedIds = new Set(results.map((r) => r.runId));
		for (const doc of docs) {
			const run = doc as unknown as RunState;
			if (!cachedIds.has(run.runId)) {
				results.push(run);
			}
		}
	} catch {
		// Cosmos unavailable — use in-memory only
	}

	// Sort newest first
	results.sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""));
	return results;
}

/**
 * Get run state synchronously (cache only, for internal use).
 */
export function getRunSync(runId: string): RunState | undefined {
	return runs.get(runId);
}

/** Apply individual patch entries to a run's task list */
function applyPatchEntries(run: RunState, patch: TaskPatch): void {
	for (const entry of patch.invalidateTasks) {
		const task = run.plan.tasks.find((t) => t.id === entry.taskId);
		if (task) {
			task.status = TaskStatus.Pending;
			pushEvent(
				run,
				"orchestrator",
				"SYSTEM",
				"TASK_INVALIDATED",
				`Task ${entry.taskId} invalidated for delta execution: ${entry.reason}`,
			);
		}
	}
	for (const entry of patch.cancelTasks) {
		const task = run.plan.tasks.find((t) => t.id === entry.taskId);
		if (task) {
			task.status = TaskStatus.Deferred;
			pushEvent(
				run,
				"orchestrator",
				"SYSTEM",
				"TASK_CANCELLED",
				`Task ${entry.taskId} cancelled: ${entry.reason}`,
			);
		}
	}
	for (const entry of patch.addTasks) {
		if (entry.newTask) {
			run.plan.tasks.push({ ...entry.newTask, status: TaskStatus.Pending });
			pushEvent(
				run,
				"orchestrator",
				"SYSTEM",
				"TASK_ADDED",
				`New task ${entry.taskId} added for delta execution: ${entry.reason}`,
			);
		}
	}
	for (const entry of patch.updateTasks) {
		const task = run.plan.tasks.find((t) => t.id === entry.taskId);
		if (task && entry.updates) {
			Object.assign(task, entry.updates);
			task.status = TaskStatus.Pending;
			pushEvent(
				run,
				"orchestrator",
				"SYSTEM",
				"TASK_UPDATED",
				`Task ${entry.taskId} updated for delta execution: ${entry.reason}`,
			);
		}
	}
}

/**
 * Apply a TaskPatch to an existing run for delta execution.
 * Patches the plan in-place: invalidates, cancels, adds, and updates tasks.
 * Does NOT call executeNextWave — caller must do that after patching.
 */
export async function applyTaskPatch(runId: string, patch: TaskPatch): Promise<Result<void>> {
	const run = await getRun(runId);
	if (!run) {
		return { ok: false, error: new Error(`Run not found: ${runId}`) };
	}

	const isPatchable =
		run.status === RunStatus.Completed ||
		run.status === RunStatus.Partial ||
		run.status === RunStatus.Paused ||
		run.status === RunStatus.Executing;
	if (!isPatchable) {
		return {
			ok: false,
			error: new Error(
				`Run must be COMPLETED, PARTIAL, PAUSED, or EXECUTING for delta execution (current: ${run.status})`,
			),
		};
	}

	// If run is currently executing, interrupt it first
	if (run.status === RunStatus.Executing) {
		run.interruptRequested = true;
		for (const task of run.plan.tasks) {
			if (task.status === TaskStatus.Running) {
				task.status = TaskStatus.Failed;
				task.failureReason = task.failureReason || "Interrupted for SCR delta execution";
			}
			if (task.status === TaskStatus.Pending) {
				task.status = TaskStatus.Deferred;
			}
		}
	}

	applyPatchEntries(run, patch);

	// Set run to AUTHORIZED — user must explicitly start execution
	run.status = RunStatus.Authorized;
	run.interruptRequested = false;
	run.completedAt = null;

	pushEvent(
		run,
		"orchestrator",
		"SYSTEM",
		"DELTA_PATCH_APPLIED",
		`Delta patch applied: ${patch.invalidateTasks.length} invalidated, ${patch.addTasks.length} added, ${patch.cancelTasks.length} cancelled — awaiting user approval to start execution`,
	);
	checkpointRun(run);
	notifyStatusChange(runId, RunStatus.Authorized);

	return { ok: true, value: undefined };
}

/**
 * Clear all runs (for testing).
 */
/**
 * Retry failed tasks — resets FAILED tasks to PENDING and resumes execution.
 */
export async function retryFailedTasks(runId: string): Promise<Result<{ retriedCount: number }>> {
	const run = await getRun(runId);
	if (!run) {
		return { ok: false, error: new Error(`Run not found: ${runId}`) };
	}

	const failedTasks = run.plan.tasks.filter((t) => t.status === TaskStatus.Failed);
	if (failedTasks.length === 0) {
		return { ok: false, error: new Error("No failed tasks to retry") };
	}

	// Reset failed tasks to PENDING and clear retry counts
	for (const task of failedTasks) {
		task.status = TaskStatus.Pending;
		run.retryCountByTask[task.id] = 0;
	}

	// Clear pending fixes for these tasks
	run.pendingFixes = run.pendingFixes.filter((f) => !failedTasks.some((t) => t.id === f.taskId));

	run.status = RunStatus.Executing;
	run.interruptRequested = false;
	run.completedAt = null;
	checkpointRun(run);

	pushEvent(
		run,
		"orchestrator",
		"SYSTEM",
		"RETRY_FAILED",
		`Retrying ${failedTasks.length} failed task(s)`,
	);

	// Resume execution
	const waveResult = await executeNextWave(runId);
	if (!waveResult.ok) {
		console.error("[Orchestrator] Retry wave failed:", waveResult.error.message);
	}

	return { ok: true, value: { retriedCount: failedTasks.length } };
}

export function clearAllRuns(): void {
	runs.clear();
	statusCallback = null;
	budgetCallback = null;
	routingLog.length = 0;
}

// ─── Internal ────────────────────────────────────────────────

function checkBudget(run: RunState): Result<AgentState[]> {
	const currentSpend = getRunTotalCost(run.runId);
	const ceiling = run.lock.budgetCeiling;
	const percentUsed = ceiling > 0 ? (currentSpend / ceiling) * 100 : 0;

	// Alert at 80%
	if (percentUsed >= 80 && budgetCallback) {
		budgetCallback(run.runId, currentSpend, ceiling, percentUsed);
	}

	// Pause at 95%
	if (percentUsed >= 95) {
		// Defer pending tasks
		for (const task of run.plan.tasks) {
			if (task.status === TaskStatus.Pending) {
				task.status = TaskStatus.Deferred;
			}
		}
		run.status = RunStatus.Paused;
		checkpointRun(run);
		notifyStatusChange(run.runId, RunStatus.Paused);
		return { ok: true, value: [] };
	}

	return { ok: true, value: [] };
}

function pauseRun(runId: string): Result<AgentState[]> {
	const run = runs.get(runId);
	if (!run) {
		return { ok: false, error: new Error(`Run not found: ${runId}`) };
	}

	// Defer pending tasks
	for (const task of run.plan.tasks) {
		if (task.status === TaskStatus.Pending) {
			task.status = TaskStatus.Deferred;
		}
	}

	run.status = RunStatus.Paused;
	run.interruptRequested = false;
	checkpointRun(run);
	notifyStatusChange(runId, RunStatus.Paused);

	return { ok: true, value: [] };
}

function completeRun(run: RunState): void {
	if (hasFailedTasks(run.plan.tasks)) {
		run.status = RunStatus.Partial;
	} else {
		run.status = RunStatus.Completed;
	}
	run.completedAt = new Date().toISOString();
	checkpointRun(run);
	notifyStatusChange(run.runId, run.status);

	// WF7: Extract learned patterns from completed tasks
	extractPatternsFromRun({
		projectId: run.projectId,
		tasks: run.plan.tasks.map((t) => ({ id: t.id, title: t.description, status: t.status })),
		wasSuccessful: run.status === RunStatus.Completed,
	}).catch((err) =>
		console.error(`[Orchestrator] WF7 pattern extraction failed for run ${run.runId}:`, err),
	);

	// WF5: Check for autonomous healing on partial runs with failures
	if (run.status === RunStatus.Partial) {
		triggerAutoHealIfNeeded(run).catch((err) =>
			console.error(`[Orchestrator] Auto-heal check failed for run ${run.runId}:`, err),
		);
	}
}

/**
 * WF5: Check if systematic failures warrant autonomous healing.
 * Fires asynchronously after run completion — does not block.
 */
async function triggerAutoHealIfNeeded(run: RunState): Promise<void> {
	try {
		const failures = await db.failures.findByProject(run.projectId);
		const normalized = failures as unknown as import("@blueflame/shared").NormalizedFailure[];

		if (shouldAutoHeal(normalized)) {
			const healingProject = await createHealingProject(normalized, run.projectId);
			console.log(
				`[Orchestrator] WF5 auto-heal triggered: created project ${healingProject.id} ` +
					`from ${normalized.length} failures in project ${run.projectId}`,
			);

			logAuditEvent({
				actor: "healing-engine",
				eventType: "AGENT",
				action: "auto-heal",
				resource: healingProject.id,
				outcome: "ALLOWED",
				details: `Auto-healing triggered: ${normalized.length} failures → project ${healingProject.id}`,
				projectId: run.projectId,
			});
		}
	} catch (err) {
		console.error("[Orchestrator] Auto-heal evaluation error:", err);
	}
}

function notifyStatusChange(runId: string, status: RunStatus): void {
	if (statusCallback) {
		statusCallback(runId, status);
	}
}
