/**
 * GitHub Actions routes — WF8 CI/CD Integration.
 *
 * Trigger workflows and list runs via @blueflame/github-app.
 */

import {
	type TriggerWorkflowParams,
	createOctokitClient,
	getWorkflowRun,
	getWorkflowRuns,
	triggerWorkflow,
} from "@blueflame/github-app";
import { Router } from "express";
import { Octokit } from "octokit";

export const githubActionsRouter = Router();

/**
 * Create an authenticated Octokit client for a given owner/repo.
 * Prefers GitHub App credentials, falls back to personal access token.
 */
async function getOctokit(owner: string, repo: string) {
	const token = process.env.GITHUB_TOKEN;
	const appId = process.env.GITHUB_APP_ID;
	const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
	const installationId = process.env.GITHUB_APP_INSTALLATION_ID;

	if (appId && privateKey && installationId) {
		return createOctokitClient({
			appId,
			privateKey,
			installationId: Number(installationId),
			owner,
			repo,
		});
	}

	if (token) {
		return new Octokit({ auth: token });
	}

	throw new Error("No GitHub credentials configured (GITHUB_TOKEN or GITHUB_APP_*)");
}

/**
 * POST /api/github/dispatch
 * Body: { owner, repo, workflowId, ref?, inputs? }
 * Trigger a GitHub Actions workflow.
 */
githubActionsRouter.post("/dispatch", async (req, res) => {
	const { owner, repo, workflowId, ref, inputs } = req.body as {
		owner?: string;
		repo?: string;
		workflowId?: string;
		ref?: string;
		inputs?: Record<string, string>;
	};

	if (!owner || !repo || !workflowId) {
		res.status(400).json({ error: "owner, repo, and workflowId are required" });
		return;
	}

	try {
		const octokit = await getOctokit(owner, repo);
		const params: TriggerWorkflowParams = {
			owner,
			repo,
			workflowId,
			ref: ref ?? "main",
			inputs,
		};

		await triggerWorkflow(octokit, params);
		res.json({
			dispatched: true,
			owner,
			repo,
			workflowId,
			ref: ref ?? "main",
		});
	} catch (error) {
		console.error("[GitHub Actions] Dispatch error:", error);
		res.status(500).json({
			error: "Failed to dispatch workflow",
			details: error instanceof Error ? error.message : String(error),
		});
	}
});

/**
 * GET /api/github/runs/:owner/:repo
 * Query params: ?branch=xxx&limit=10
 * List recent workflow runs.
 */
githubActionsRouter.get("/runs/:owner/:repo", async (req, res) => {
	const { owner, repo } = req.params;
	const { branch, limit } = req.query as { branch?: string; limit?: string };

	try {
		const octokit = await getOctokit(owner, repo);
		const runs = await getWorkflowRuns(
			octokit,
			owner,
			repo,
			branch ?? "main",
			Math.min(Number.parseInt(limit ?? "10", 10), 50),
		);

		res.json({ runs, total: runs.length });
	} catch (error) {
		console.error("[GitHub Actions] List runs error:", error);
		res.status(500).json({
			error: "Failed to list workflow runs",
			details: error instanceof Error ? error.message : String(error),
		});
	}
});

/**
 * GET /api/github/runs/:owner/:repo/:runId
 * Get a specific workflow run.
 */
githubActionsRouter.get("/runs/:owner/:repo/:runId", async (req, res) => {
	const { owner, repo, runId } = req.params;

	try {
		const octokit = await getOctokit(owner, repo);
		const run = await getWorkflowRun(octokit, owner, repo, Number(runId));
		res.json(run);
	} catch (error) {
		console.error("[GitHub Actions] Get run error:", error);
		res.status(500).json({
			error: "Failed to get workflow run",
			details: error instanceof Error ? error.message : String(error),
		});
	}
});
