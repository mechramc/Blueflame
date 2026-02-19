import { Router } from "express";

import { BudgetDecision } from "@blueflame/shared";

import {
	checkBudget,
	getBudgetStateSync,
	handleBudgetDecision,
	initBudget,
} from "../services/budget-monitor.js";
import { getRunCost, getRunCostByAgent, getRunTokenUsage } from "../services/cost-tracker.js";

export const budgetRouter = Router();

/** GET /api/budget/:runId — get budget state + cost breakdown */
budgetRouter.get("/:runId", (req, res) => {
	const { runId } = req.params;
	let state = getBudgetStateSync(runId);
	if (!state) {
		// Auto-init with default ceiling so costs always display
		state = initBudget(runId, 10.0);
	}

	// Always refresh spend from cost tracker (handles post-restart recovery)
	const freshCost = getRunCost(runId);
	state.currentSpend = freshCost;
	state.percentUsed = state.ceiling > 0 ? (freshCost / state.ceiling) * 100 : 0;

	const byAgent = getRunCostByAgent(runId);
	const tokens = getRunTokenUsage(runId);
	const agentBreakdown: Record<string, number> = {};
	for (const [agentId, cost] of byAgent) {
		agentBreakdown[agentId] = cost;
	}

	res.json({
		...state,
		agentBreakdown,
		tokens,
	});
});

/** POST /api/budget/init — initialize budget for a run */
budgetRouter.post("/init", (req, res) => {
	const { runId, ceiling } = req.body as { runId: string; ceiling: number };
	if (!runId || typeof ceiling !== "number" || ceiling <= 0) {
		res.status(400).json({ error: "runId and positive ceiling required" });
		return;
	}
	const state = initBudget(runId, ceiling);
	res.status(201).json(state);
});

/** POST /api/budget/:runId/check — check budget thresholds */
budgetRouter.post("/:runId/check", (req, res) => {
	const { runId } = req.params;
	const level = checkBudget(runId);
	const state = getBudgetStateSync(runId);
	res.json({ level, state });
});

/** POST /api/budget/:runId/decision — handle pause decision */
budgetRouter.post("/:runId/decision", (req, res) => {
	const { runId } = req.params;
	const { decision, topUpAmount } = req.body as {
		decision: BudgetDecision;
		topUpAmount?: number;
	};

	if (!Object.values(BudgetDecision).includes(decision)) {
		res.status(400).json({ error: "Invalid decision" });
		return;
	}

	const state = handleBudgetDecision(runId, decision, topUpAmount);
	if (!state) {
		res.status(404).json({ error: "Budget not found for run" });
		return;
	}

	res.json(state);
});

/** GET /api/budget/:runId/cost — get raw cost data */
budgetRouter.get("/:runId/cost", (req, res) => {
	const { runId } = req.params;
	const totalCost = getRunCost(runId);
	const tokens = getRunTokenUsage(runId);
	const byAgent = getRunCostByAgent(runId);
	const agentBreakdown: Record<string, number> = {};
	for (const [agentId, cost] of byAgent) {
		agentBreakdown[agentId] = cost;
	}
	res.json({ totalCost, tokens, agentBreakdown });
});
