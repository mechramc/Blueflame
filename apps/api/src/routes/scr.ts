/**
 * SCR (Spec Change Request) routes — governance for frozen spec modifications.
 */

import { Router } from "express";
import {
	approveSCR,
	createSCR,
	executeDeltaRun,
	getSCR,
	listSCRsByProject,
	rejectSCR,
} from "../services/scr-service.js";

export const scrRouter = Router();

/**
 * POST /api/scr
 * Create an SCR with automatic impact analysis.
 * Body: { projectId, frozenSpecId, newContent, reason, requestedBy? }
 */
scrRouter.post("/", async (req, res) => {
	const { projectId, frozenSpecId, newContent, reason, requestedBy } = req.body as {
		projectId: string;
		frozenSpecId: string;
		newContent: string;
		reason: string;
		requestedBy?: string;
	};

	if (!projectId || !frozenSpecId || !newContent || !reason) {
		res.status(400).json({
			error: "projectId, frozenSpecId, newContent, and reason are required",
		});
		return;
	}

	const result = await createSCR(
		projectId,
		frozenSpecId,
		newContent,
		requestedBy ?? "user",
		reason,
	);
	if (!result.ok) {
		res.status(409).json({ error: result.error.message });
		return;
	}

	res.status(201).json({ scr: result.value });
});

/**
 * GET /api/scr/:scrId
 * Get an SCR by ID.
 */
scrRouter.get("/:scrId", async (req, res) => {
	const scr = await getSCR(req.params.scrId);
	if (!scr) {
		res.status(404).json({ error: `SCR not found: ${req.params.scrId}` });
		return;
	}
	res.json({ scr });
});

/**
 * GET /api/scr/project/:projectId
 * List SCRs for a project.
 */
scrRouter.get("/project/:projectId", async (req, res) => {
	const scrs = await listSCRsByProject(req.params.projectId);
	res.json({ scrs });
});

/**
 * PUT /api/scr/:scrId/approve
 * Approve an SCR and generate TaskPatch.
 * Body: { reviewedBy? }
 */
scrRouter.put("/:scrId/approve", async (req, res) => {
	const { reviewedBy } = req.body as { reviewedBy?: string };

	const result = await approveSCR(req.params.scrId, reviewedBy ?? "authorizer");
	if (!result.ok) {
		res.status(409).json({ error: result.error.message });
		return;
	}

	res.json({ scr: result.value });
});

/**
 * PUT /api/scr/:scrId/reject
 * Reject an SCR.
 * Body: { reviewedBy?, reason }
 */
scrRouter.put("/:scrId/reject", async (req, res) => {
	const { reviewedBy, reason } = req.body as { reviewedBy?: string; reason: string };

	if (!reason) {
		res.status(400).json({ error: "reason is required for rejection" });
		return;
	}

	const result = await rejectSCR(req.params.scrId, reviewedBy ?? "authorizer", reason);
	if (!result.ok) {
		res.status(409).json({ error: result.error.message });
		return;
	}

	res.json({ scr: result.value });
});

/**
 * POST /api/scr/:scrId/execute
 * Execute delta run from an approved SCR.
 */
scrRouter.post("/:scrId/execute", async (req, res) => {
	const result = await executeDeltaRun(req.params.scrId);
	if (!result.ok) {
		res.status(409).json({ error: result.error.message });
		return;
	}

	res.json({ runId: result.value.runId });
});
