/**
 * Authorization route — creates PlanLock and authorizes execution
 */

import { Router } from "express";
import { requireRole } from "../middleware/auth.js";
import { authorizePlan, getLockByRunId } from "../services/authorization.js";
import { getPlanByRunId } from "../services/planning.js";

const router = Router();

/**
 * POST /api/authorize
 * Body: { runId: string, budgetCeiling: number, constraints?: Constraint[] }
 * Creates an immutable PlanLock and authorizes agent execution.
 * Requires Authorizer role. authorizedBy and userRoles come from req.user.
 */
router.post("/", requireRole("Blueflame_Authorizer"), async (req, res) => {
	const { runId, budgetCeiling, constraints } = req.body as {
		runId: string;
		budgetCeiling: number;
		constraints?: [];
	};

	const authorizedBy = req.user?.name ?? req.user?.preferred_username ?? "unknown";
	const userRoles = req.user?.roles ?? [];

	if (!runId || !budgetCeiling) {
		res.status(400).json({
			error: "runId and budgetCeiling are required",
		});
		return;
	}

	const plan = await getPlanByRunId(runId);
	if (!plan) {
		res.status(404).json({ error: `No plan found for run: ${runId}` });
		return;
	}

	const result = await authorizePlan({
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
router.get("/:runId", async (req, res) => {
	const lock = await getLockByRunId(req.params.runId);
	if (!lock) {
		res.status(404).json({ error: "No lock found for this run" });
		return;
	}
	res.json({ lock });
});

export const authorizeRouter = router;
