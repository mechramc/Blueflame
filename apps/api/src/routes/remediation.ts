/**
 * Remediation routes — manage failure remediation lifecycle.
 *
 * Source: Blueflame-Spec-v3-ACAR.md Section 10.5
 */

import { Router } from "express";
import type { RootCauseAnalysis } from "@blueflame/shared";
import {
	attachRootCause,
	authorizeRemediation,
	completeRemediation,
	createRemediation,
	failRemediation,
	getRemediation,
	getRemediationsByFailureId,
	getRemediationsByRunId,
	startAnalysis,
	startRemediationExecution,
} from "../services/remediation.js";

export const remediationRouter = Router();

/**
 * POST /api/remediation
 * Body: { failureId, runId, projectId, parentLockId }
 * Create a new remediation record.
 */
remediationRouter.post("/", (req, res) => {
	const { failureId, runId, projectId, parentLockId } = req.body as {
		failureId: string;
		runId: string;
		projectId: string;
		parentLockId: string;
	};

	if (!failureId || !runId || !projectId || !parentLockId) {
		res.status(400).json({
			error: "failureId, runId, projectId, and parentLockId are required",
		});
		return;
	}

	const remediation = createRemediation({ failureId, runId, projectId, parentLockId });
	res.status(201).json(remediation);
});

/**
 * GET /api/remediation?failureId=xxx or ?runId=xxx
 */
remediationRouter.get("/", (req, res) => {
	const { failureId, runId } = req.query as {
		failureId?: string;
		runId?: string;
	};

	if (failureId) {
		res.json(getRemediationsByFailureId(failureId));
		return;
	}

	if (runId) {
		res.json(getRemediationsByRunId(runId));
		return;
	}

	res.status(400).json({ error: "failureId or runId query parameter required" });
});

/**
 * GET /api/remediation/:remediationId
 */
remediationRouter.get("/:remediationId", (req, res) => {
	const { remediationId } = req.params;
	const rem = getRemediation(remediationId);

	if (!rem) {
		res.status(404).json({ error: `Remediation not found: ${remediationId}` });
		return;
	}

	res.json(rem);
});

/**
 * POST /api/remediation/:remediationId/analyze
 * Transition to ANALYZING state.
 */
remediationRouter.post("/:remediationId/analyze", (req, res) => {
	const { remediationId } = req.params;
	const rem = startAnalysis(remediationId);

	if (!rem) {
		res.status(409).json({ error: "Cannot start analysis — invalid state or not found" });
		return;
	}

	res.json(rem);
});

/**
 * POST /api/remediation/:remediationId/root-cause
 * Body: { rootCause: RootCauseAnalysis }
 * Attach root cause and transition to PLAN_READY.
 */
remediationRouter.post("/:remediationId/root-cause", (req, res) => {
	const { remediationId } = req.params;
	const { rootCause } = req.body as { rootCause: RootCauseAnalysis };

	if (!rootCause) {
		res.status(400).json({ error: "rootCause is required" });
		return;
	}

	const rem = attachRootCause(remediationId, rootCause);
	if (!rem) {
		res.status(409).json({ error: "Cannot attach root cause — invalid state or not found" });
		return;
	}

	res.json(rem);
});

/**
 * POST /api/remediation/:remediationId/authorize
 * Body: { lockId }
 * Authorize with new lock ID.
 */
remediationRouter.post("/:remediationId/authorize", (req, res) => {
	const { remediationId } = req.params;
	const { lockId } = req.body as { lockId: string };

	if (!lockId) {
		res.status(400).json({ error: "lockId is required" });
		return;
	}

	const rem = authorizeRemediation(remediationId, lockId);
	if (!rem) {
		res.status(409).json({ error: "Cannot authorize — invalid state or not found" });
		return;
	}

	res.json(rem);
});

/**
 * POST /api/remediation/:remediationId/execute
 * Transition to EXECUTING.
 */
remediationRouter.post("/:remediationId/execute", (req, res) => {
	const { remediationId } = req.params;
	const rem = startRemediationExecution(remediationId);

	if (!rem) {
		res.status(409).json({ error: "Cannot start execution — invalid state or not found" });
		return;
	}

	res.json(rem);
});

/**
 * POST /api/remediation/:remediationId/complete
 * Mark as COMPLETED.
 */
remediationRouter.post("/:remediationId/complete", (req, res) => {
	const { remediationId } = req.params;
	const rem = completeRemediation(remediationId);

	if (!rem) {
		res.status(409).json({ error: "Cannot complete — invalid state or not found" });
		return;
	}

	res.json(rem);
});

/**
 * POST /api/remediation/:remediationId/fail
 * Mark as FAILED.
 */
remediationRouter.post("/:remediationId/fail", (req, res) => {
	const { remediationId } = req.params;
	const rem = failRemediation(remediationId);

	if (!rem) {
		res.status(409).json({ error: "Cannot fail — not found" });
		return;
	}

	res.json(rem);
});
