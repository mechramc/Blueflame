/**
 * Chargeback route — cost aggregation endpoints.
 */

import { Router } from "express";
import { getAggregatedCosts, getCostTotals } from "../services/cost-tracker.js";

const router = Router();

/**
 * GET /api/chargeback
 * Returns aggregated cost data for chargeback dashboard.
 */
router.get("/", (_req, res) => {
	const entries = getAggregatedCosts();
	const totals = getCostTotals();
	res.json({ entries, totals });
});

export const chargebackRouter = router;
