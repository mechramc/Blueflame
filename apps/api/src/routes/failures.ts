/**
 * Failure routes — query normalized CI/CD failures.
 *
 * Source: Blueflame-Spec-v3-ACAR.md Section 10.3
 */

import { Router } from "express";
import {
	getAllFailures,
	getFailure,
	getFailuresByProjectId,
	getFailuresByRunId,
} from "../services/failure-store.js";

export const failuresRouter = Router();

/**
 * GET /api/failures
 * List all failures. Optional query: ?runId=xxx or ?projectId=xxx
 */
failuresRouter.get("/", async (req, res) => {
	const { runId, projectId } = req.query as {
		runId?: string;
		projectId?: string;
	};

	if (runId) {
		res.json(await getFailuresByRunId(runId));
		return;
	}

	if (projectId) {
		res.json(await getFailuresByProjectId(projectId));
		return;
	}

	res.json(await getAllFailures());
});

/**
 * GET /api/failures/:failureId
 * Get a single failure by ID.
 */
failuresRouter.get("/:failureId", async (req, res) => {
	const { failureId } = req.params;
	const failure = await getFailure(failureId);

	if (!failure) {
		res.status(404).json({ error: `Failure not found: ${failureId}` });
		return;
	}

	res.json(failure);
});
