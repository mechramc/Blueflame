/**
 * Deployment routes — GitHub sync, CI status, deploy trigger.
 */

import { Router } from "express";
import {
	getCIStatus,
	isGitHubConfigured,
	syncToGitHub,
	triggerDeploy,
} from "../services/deployment-service.js";

export const deploymentRouter = Router();

/**
 * POST /api/deployment/:runId/sync
 * Commit task outputs to GitHub and create a PR.
 * Body: { commitMessage?: string }
 */
deploymentRouter.post("/:runId/sync", async (req, res) => {
	const { runId } = req.params;
	const { commitMessage } = req.body as { commitMessage?: string };

	if (!isGitHubConfigured()) {
		res.status(503).json({ error: "GitHub integration not configured" });
		return;
	}

	const result = await syncToGitHub(runId, commitMessage);
	if (!result.ok) {
		res.status(400).json({ error: result.error.message });
		return;
	}

	res.json({
		branch: result.value.branch,
		commitSha: result.value.commit.sha,
		prNumber: result.value.pr.number,
		prUrl: result.value.pr.htmlUrl,
	});
});

/**
 * GET /api/deployment/:runId/ci-status
 * Poll CI workflow status for the run's branch.
 */
deploymentRouter.get("/:runId/ci-status", async (req, res) => {
	const { runId } = req.params;

	if (!isGitHubConfigured()) {
		res.status(503).json({ error: "GitHub integration not configured" });
		return;
	}

	const result = await getCIStatus(runId);
	if (!result.ok) {
		res.status(400).json({ error: result.error.message });
		return;
	}

	res.json({
		step: result.value.step,
		workflowRuns: result.value.runs,
	});
});

/**
 * POST /api/deployment/:runId/deploy
 * Trigger deploy workflow (requires CI passed).
 */
deploymentRouter.post("/:runId/deploy", async (req, res) => {
	const { runId } = req.params;

	if (!isGitHubConfigured()) {
		res.status(503).json({ error: "GitHub integration not configured" });
		return;
	}

	const result = await triggerDeploy(runId);
	if (!result.ok) {
		res.status(400).json({ error: result.error.message });
		return;
	}

	res.json({ deployed: true, runId });
});
