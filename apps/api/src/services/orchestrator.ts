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
import type { AgentState, PlanLock, TaskPlan } from "@blueflame/shared";
import { AgentRole, AgentStatus, RunStatus, TaskStatus } from "@blueflame/shared";
import type { Result } from "@blueflame/shared";
import {
	getRunTotalCost,
	recordAgentUsage,
	spawnAgent,
	updateAgentStatus,
} from "./agent-spawner.js";
import { allTasksTerminal, getReadyTasks, hasFailedTasks } from "./dag-executor.js";

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
}

/** In-memory run store — hot state for active runs */
const runs = new Map<string, RunState>();

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
export function startExecution(plan: TaskPlan, lock: PlanLock): Result<RunState> {
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
	};

	runs.set(plan.runId, runState);
	notifyStatusChange(plan.runId, RunStatus.Executing);

	return { ok: true, value: runState };
}

/**
 * Execute the next wave of ready tasks.
 * Returns the spawned agents for the tasks.
 */
export async function executeNextWave(runId: string): Promise<Result<AgentState[]>> {
	const run = runs.get(runId);
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

	const readyTasks = getReadyTasks(run.plan.tasks);

	if (readyTasks.length === 0) {
		if (allTasksTerminal(run.plan.tasks)) {
			completeRun(run);
		}
		return { ok: true, value: [] };
	}

	const spawnedAgents: AgentState[] = [];

	for (const task of readyTasks) {
		// σ-routing: select model based on task sigma estimate
		const decision = router.route(task.agentRole, task.sigmaEstimate);
		routingLog.push(decision);
		const model = decision.model;
		const agent = await spawnAgent(runId, task.agentRole, task.id, model);

		// Mark task as running
		task.status = TaskStatus.Running;

		// Mark agent as executing
		await updateAgentStatus(agent.agentId, AgentStatus.Executing);

		spawnedAgents.push(agent);
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
): Promise<Result<{ verifierAgent?: AgentState }>> {
	const run = runs.get(runId);
	if (!run) {
		return { ok: false, error: new Error(`Run not found: ${runId}`) };
	}

	const task = run.plan.tasks.find((t) => t.id === taskId);
	if (!task) {
		return { ok: false, error: new Error(`Task not found: ${taskId}`) };
	}

	// Record usage
	await recordAgentUsage(agentId, tokensUsed, costIncurred, sigmaValue);
	await updateAgentStatus(agentId, AgentStatus.Completed);

	// A2A handoff: Builder → Verifier (use task's σ for verifier routing)
	if (task.agentRole === AgentRole.Builder) {
		const verifierDecision = router.route(AgentRole.Verifier, task.sigmaEstimate);
		routingLog.push(verifierDecision);
		const verifier = await spawnAgent(runId, AgentRole.Verifier, taskId, verifierDecision.model);
		await updateAgentStatus(verifier.agentId, AgentStatus.Executing);
		return { ok: true, value: { verifierAgent: verifier } };
	}

	// Non-Builder roles (Verifier, Explainer, Planner) → mark task completed
	task.status = TaskStatus.Completed;

	return { ok: true, value: {} };
}

/**
 * Fail a task.
 */
export async function failTask(
	runId: string,
	taskId: string,
	agentId: string,
	tokensUsed: number,
	costIncurred: number,
): Promise<Result<void>> {
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
	task.status = TaskStatus.Failed;

	return { ok: true, value: undefined };
}

/**
 * Request interruption of a run (user stop).
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
	return { ok: true, value: undefined };
}

/**
 * Get run state.
 */
export function getRun(runId: string): RunState | undefined {
	return runs.get(runId);
}

/**
 * Clear all runs (for testing).
 */
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
	notifyStatusChange(run.runId, run.status);
}

function notifyStatusChange(runId: string, status: RunStatus): void {
	if (statusCallback) {
		statusCallback(runId, status);
	}
}
