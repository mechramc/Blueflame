/**
 * Execution routes — start, advance, interrupt runs.
 */

import { getRunSpans, getSpanTree } from "@blueflame/foundry";
import { Router } from "express";
import { requireRole } from "../middleware/auth.js";
import { getAgentsByRunId } from "../services/agent-spawner.js";
import { logAuditEvent } from "../services/audit-logger.js";
import { getLockByRunId } from "../services/authorization.js";
import {
	approveFix,
	completeTask,
	executeNextWave,
	failTask,
	getRun,
	overrideTask,
	rejectFix,
	requestInterrupt,
	retryFailedTasks,
	startExecution,
	submitFix,
} from "../services/orchestrator.js";
import { getPlanByRunId } from "../services/planning.js";

export const executionRouter = Router();

/**
 * POST /api/execution/start
 * Body: { runId }
 * Start executing an authorized plan.
 */
executionRouter.post("/start", async (req, res) => {
	const { runId } = req.body as { runId: string };

	if (!runId) {
		res.status(400).json({ error: "runId is required" });
		return;
	}

	const plan = await getPlanByRunId(runId);
	if (!plan) {
		res.status(404).json({ error: `Plan not found for run: ${runId}` });
		return;
	}

	const lock = await getLockByRunId(runId);
	if (!lock) {
		res.status(404).json({ error: `Lock not found for run: ${runId}` });
		return;
	}

	try {
		const result = await startExecution(plan, lock);
		if (!result.ok) {
			res.status(409).json({ error: result.error.message });
			return;
		}

		res.status(201).json({
			runId: result.value.runId,
			status: result.value.status,
			startedAt: result.value.startedAt,
		});
	} catch (error) {
		console.error("[Execution] Start error:", error);
		res.status(500).json({ error: "Failed to start execution" });
	}
});

/**
 * POST /api/execution/:runId/advance
 * Execute the next wave of ready tasks.
 */
executionRouter.post("/:runId/advance", async (req, res) => {
	const { runId } = req.params;

	if (!runId) {
		res.status(400).json({ error: "runId is required" });
		return;
	}

	const result = await executeNextWave(runId);
	if (!result.ok) {
		res.status(400).json({ error: result.error.message });
		return;
	}

	const run = await getRun(runId);
	res.json({
		runId,
		status: run?.status,
		agentsSpawned: result.value.length,
		agents: result.value.map((a) => ({
			agentId: a.agentId,
			role: a.role,
			taskId: a.taskId,
		})),
	});
});

/**
 * POST /api/execution/:runId/complete-task
 * Body: { taskId, agentId, tokensUsed, costIncurred, sigmaValue? }
 */
executionRouter.post("/:runId/complete-task", async (req, res) => {
	const { runId } = req.params;
	const { taskId, agentId, tokensUsed, costIncurred, sigmaValue } = req.body as {
		taskId: string;
		agentId: string;
		tokensUsed: number;
		costIncurred: number;
		sigmaValue?: number;
	};

	if (!runId || !taskId || !agentId) {
		res.status(400).json({ error: "runId, taskId, and agentId are required" });
		return;
	}

	const result = await completeTask(
		runId,
		taskId,
		agentId,
		tokensUsed ?? 0,
		costIncurred ?? 0,
		sigmaValue,
	);
	if (!result.ok) {
		res.status(400).json({ error: result.error.message });
		return;
	}

	res.json({
		runId,
		taskId,
		verifierSpawned: !!result.value.verifierAgent,
		verifierAgentId: result.value.verifierAgent?.agentId ?? null,
	});
});

/**
 * POST /api/execution/:runId/fail-task
 * Body: { taskId, agentId, tokensUsed, costIncurred }
 */
executionRouter.post("/:runId/fail-task", async (req, res) => {
	const { runId } = req.params;
	const { taskId, agentId, tokensUsed, costIncurred, originalCode, errorMessage, failingRole } =
		req.body as {
			taskId: string;
			agentId: string;
			tokensUsed: number;
			costIncurred: number;
			originalCode?: string;
			errorMessage?: string;
			failingRole?: string;
		};

	if (!runId || !taskId || !agentId) {
		res.status(400).json({ error: "runId, taskId, and agentId are required" });
		return;
	}

	const result = await failTask(
		runId,
		taskId,
		agentId,
		tokensUsed ?? 0,
		costIncurred ?? 0,
		originalCode,
		errorMessage,
		failingRole as import("@blueflame/shared").AgentRole | undefined,
	);
	if (!result.ok) {
		res.status(400).json({ error: result.error.message });
		return;
	}

	res.json({ runId, taskId, status: "FAILED" });
});

/**
 * POST /api/execution/:runId/interrupt
 * Request interruption of an executing run.
 */
executionRouter.post("/:runId/interrupt", (req, res) => {
	const { runId } = req.params;

	if (!runId) {
		res.status(400).json({ error: "runId is required" });
		return;
	}

	const result = requestInterrupt(runId);
	if (!result.ok) {
		res.status(400).json({ error: result.error.message });
		return;
	}

	res.json({ runId, interruptRequested: true });
});

/**
 * GET /api/execution/:runId/spans
 * Get trace spans for a run (flat list + tree).
 */
executionRouter.get("/:runId/spans", (req, res) => {
	const { runId } = req.params;
	const spans = getRunSpans(runId);
	const tree = getSpanTree(runId);
	res.json({ spans, tree });
});

/**
 * GET /api/execution/:runId
 * Get current run state.
 */
executionRouter.get("/:runId", async (req, res) => {
	const { runId } = req.params;
	const run = await getRun(runId);

	if (!run) {
		res.status(404).json({ error: `Run not found: ${runId}` });
		return;
	}

	const agents = getAgentsByRunId(runId);

	res.json({
		runId: run.runId,
		status: run.status,
		projectId: run.projectId,
		specId: run.plan.specId,
		lockId: run.lockId,
		startedAt: run.startedAt,
		completedAt: run.completedAt,
		plan: { tasks: run.plan.tasks },
		agents: agents.map((a) => ({
			agentId: a.agentId,
			role: a.role,
			status: a.status,
			taskId: a.taskId,
			model: a.model,
			tokensUsed: a.tokensUsed,
			costIncurred: a.costIncurred,
			sigmaValue: a.sigmaValue,
		})),
		events: run.events,
		pendingFixes: run.pendingFixes ?? [],
		taskOutputs: run.taskOutputs ?? {},
		deploymentState: run.deploymentState ?? null,
	});
});

/**
 * POST /api/execution/:runId/retry-failed
 * Reset failed tasks to PENDING and resume execution.
 */
executionRouter.post("/:runId/retry-failed", async (req, res) => {
	const { runId } = req.params;
	const result = await retryFailedTasks(runId);
	if (!result.ok) {
		res.status(400).json({ error: result.error.message });
		return;
	}
	res.json({ runId, retriedCount: result.value.retriedCount });
});

/**
 * POST /api/execution/:runId/override-task
 * Body: { taskId, reason }
 * Admin-only: Force-complete a failed/deferred task so the run can proceed.
 * The human takes responsibility for testing this task manually.
 */
executionRouter.post("/:runId/override-task", requireRole("Blueflame_Admin"), async (req, res) => {
	const { runId } = req.params;
	const { taskId, reason } = req.body as { taskId: string; reason?: string };

	console.log(`[Override] Request: runId=${runId} taskId=${taskId} reason=${reason}`);

	if (!runId || !taskId) {
		res.status(400).json({ error: "runId and taskId are required" });
		return;
	}

	const adminUser = String(req.user?.name ?? req.user?.oid ?? "admin");
	const overrideReason = reason || "Admin override — will test manually";

	const result = await overrideTask(String(runId), taskId, overrideReason, adminUser);
	if (!result.ok) {
		console.error(`[Override] Failed: ${result.error.message}`);
		res.status(400).json({ error: result.error.message });
		return;
	}
	console.log(`[Override] Success: task ${taskId} overridden by ${adminUser}`);

	// Audit trail
	logAuditEvent({
		eventType: "GOVERNANCE",
		actor: adminUser,
		action: "OVERRIDE_TASK",
		resource: `run:${runId}/task:${taskId}`,
		outcome: "ALLOWED",
		details: `Admin override: ${overrideReason}`,
		runId: String(runId),
	}).catch(() => {});

	res.json({ runId, taskId, status: "COMPLETED", overriddenBy: adminUser, reason: overrideReason });
});

/**
 * POST /api/execution/:runId/submit-fix
 * Body: { taskId, fixerId, fixedCode, explanation }
 * Submit a fixer agent's proposed fix.
 */
executionRouter.post("/:runId/submit-fix", (req, res) => {
	const { runId } = req.params;
	const { taskId, fixerId, fixedCode, explanation } = req.body as {
		taskId: string;
		fixerId: string;
		fixedCode: string;
		explanation: string;
	};

	const result = submitFix(runId, taskId, fixerId, fixedCode, explanation);
	if (!result.ok) {
		res.status(400).json({ error: result.error.message });
		return;
	}

	res.json({ fix: result.value });
});

/**
 * POST /api/execution/:runId/approve-fix
 * Body: { taskId }
 * Approve a pending fix and re-run Verifier.
 */
executionRouter.post("/:runId/approve-fix", async (req, res) => {
	const { runId } = req.params;
	const { taskId } = req.body as { taskId: string };

	const result = await approveFix(runId, taskId);
	if (!result.ok) {
		res.status(400).json({ error: result.error.message });
		return;
	}

	res.json({
		taskId,
		verifierAgent: {
			agentId: result.value.verifierAgent.agentId,
			role: result.value.verifierAgent.role,
		},
	});
});

/**
 * POST /api/execution/:runId/reject-fix
 * Body: { taskId }
 * Reject a pending fix and mark task as permanently failed.
 */
executionRouter.post("/:runId/reject-fix", (req, res) => {
	const { runId } = req.params;
	const { taskId } = req.body as { taskId: string };

	const result = rejectFix(runId, taskId);
	if (!result.ok) {
		res.status(400).json({ error: result.error.message });
		return;
	}

	res.json({ taskId, status: "rejected" });
});
