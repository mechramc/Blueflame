/**
 * Authorization route — creates PlanLock and authorizes execution
 */

import { Router } from "express";
import { getPlanByRunId } from "../services/planning.js";
import { authorizePlan, getLockByRunId } from "../services/authorization.js";

const router = Router();

/**
 * POST /api/authorize
 * Body: { runId: string, budgetCeiling: number, authorizedBy: string, userRoles: string[], constraints?: Constraint[] }
 * Creates an immutable PlanLock and authorizes agent execution.
 */
router.post("/", (req, res) => {
	const { runId, budgetCeiling, authorizedBy, userRoles, constraints } = req.body as {
		runId: string;
		budgetCeiling: number;
		authorizedBy: string;
		userRoles: string[];
		constraints?: [];
	};

	if (!runId || !budgetCeiling || !authorizedBy || !userRoles) {
		res.status(400).json({
			error: "runId, budgetCeiling, authorizedBy, and userRoles are required",
		});
		return;
	}

	const plan = getPlanByRunId(runId);
	if (!plan) {
		res.status(404).json({ error: `No plan found for run: ${runId}` });
		return;
	}

	const result = authorizePlan({
		plan,
		budgetCeiling,
		authorizedBy,
		userRoles,
		constraints,
	});

	if (!result.ok) {
		res.status(403).json({ error: result.error.message });
		return;
	}

	res.json({ lock: result.value });
});

/**
 * GET /api/authorize/:runId
 * Returns the lock for a run.
 */
router.get("/:runId", (req, res) => {
	const lock = getLockByRunId(req.params.runId);
	if (!lock) {
		res.status(404).json({ error: "No lock found for this run" });
		return;
	}
	res.json({ lock });
});

export const authorizeRouter = router;
