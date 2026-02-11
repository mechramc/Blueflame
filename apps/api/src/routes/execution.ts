/**
 * Execution routes — start, advance, interrupt runs.
 */

import { Router } from "express";
import { getLockByRunId } from "../services/authorization.js";
import { getPlanByRunId } from "../services/planning.js";
import {
	completeTask,
	executeNextWave,
	failTask,
	getRun,
	requestInterrupt,
	startExecution,
} from "../services/orchestrator.js";

export const executionRouter = Router();

/**
 * POST /api/execution/start
 * Body: { runId }
 * Start executing an authorized plan.
 */
executionRouter.post("/start", (req, res) => {
	const { runId } = req.body as { runId: string };

	if (!runId) {
		res.status(400).json({ error: "runId is required" });
		return;
	}

	const plan = getPlanByRunId(runId);
	if (!plan) {
		res.status(404).json({ error: `Plan not found for run: ${runId}` });
		return;
	}

	const lock = getLockByRunId(runId);
	if (!lock) {
		res.status(404).json({ error: `Lock not found for run: ${runId}` });
		return;
	}

	const result = startExecution(plan, lock);
	if (!result.ok) {
		res.status(409).json({ error: result.error.message });
		return;
	}

	res.status(201).json({
		runId: result.value.runId,
		status: result.value.status,
		startedAt: result.value.startedAt,
	});
});

/**
 * POST /api/execution/:runId/advance
 * Execute the next wave of ready tasks.
 */
executionRouter.post("/:runId/advance", (req, res) => {
	const { runId } = req.params;

	if (!runId) {
		res.status(400).json({ error: "runId is required" });
		return;
	}

	const result = executeNextWave(runId);
	if (!result.ok) {
		res.status(400).json({ error: result.error.message });
		return;
	}

	const run = getRun(runId);
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
executionRouter.post("/:runId/complete-task", (req, res) => {
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

	const result = completeTask(runId, taskId, agentId, tokensUsed ?? 0, costIncurred ?? 0, sigmaValue);
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
executionRouter.post("/:runId/fail-task", (req, res) => {
	const { runId } = req.params;
	const { taskId, agentId, tokensUsed, costIncurred } = req.body as {
		taskId: string;
		agentId: string;
		tokensUsed: number;
		costIncurred: number;
	};

	if (!runId || !taskId || !agentId) {
		res.status(400).json({ error: "runId, taskId, and agentId are required" });
		return;
	}

	const result = failTask(runId, taskId, agentId, tokensUsed ?? 0, costIncurred ?? 0);
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
 * GET /api/execution/:runId
 * Get current run state.
 */
executionRouter.get("/:runId", (req, res) => {
	const { runId } = req.params;
	const run = getRun(runId);

	if (!run) {
		res.status(404).json({ error: `Run not found: ${runId}` });
		return;
	}

	res.json({
		runId: run.runId,
		status: run.status,
		lockId: run.lockId,
		startedAt: run.startedAt,
		completedAt: run.completedAt,
		tasks: run.plan.tasks.map((t) => ({
			id: t.id,
			status: t.status,
			agentRole: t.agentRole,
		})),
	});
});
