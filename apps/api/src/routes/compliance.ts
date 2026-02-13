/**
 * Compliance route — audit log query endpoint.
 */

import { Router } from "express";
import { type AuditQueryFilters, queryAuditLog } from "../services/audit-logger.js";

const router = Router();

/**
 * GET /api/compliance/audit-log
 * Query audit log with optional filters.
 */
router.get("/audit-log", (req, res) => {
	const filters: AuditQueryFilters = {
		eventType: req.query.eventType as string | undefined,
		outcome: req.query.outcome as string | undefined,
		search: req.query.search as string | undefined,
		dateFrom: req.query.dateFrom as string | undefined,
		dateTo: req.query.dateTo as string | undefined,
	};

	const result = queryAuditLog(filters);
	res.json(result);
});

export const complianceRouter = router;
