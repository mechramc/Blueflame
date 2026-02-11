/**
 * GitHub Actions operations via Octokit.
 *
 * Trigger workflow dispatches and query workflow run results.
 */

import type { Octokit } from "octokit";

export interface TriggerWorkflowParams {
	owner: string;
	repo: string;
	/** Workflow file name (e.g., "ci.yml") */
	workflowId: string;
	/** Branch to run on */
	ref: string;
	/** Optional inputs for the workflow */
	inputs?: Record<string, string>;
}

export interface WorkflowRun {
	id: number;
	name: string;
	status: string;
	conclusion: string | null;
	headBranch: string;
	htmlUrl: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * Trigger a workflow dispatch.
 */
export async function triggerWorkflow(
	octokit: Octokit,
	params: TriggerWorkflowParams,
): Promise<void> {
	await octokit.rest.actions.createWorkflowDispatch({
		owner: params.owner,
		repo: params.repo,
		workflow_id: params.workflowId,
		ref: params.ref,
		inputs: params.inputs,
	});
}

/**
 * Get workflow runs for a branch.
 */
export async function getWorkflowRuns(
	octokit: Octokit,
	owner: string,
	repo: string,
	branch: string,
	limit = 5,
): Promise<WorkflowRun[]> {
	const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
		owner,
		repo,
		branch,
		per_page: limit,
	});

	return data.workflow_runs.map((run) => ({
		id: run.id,
		name: run.name ?? "",
		status: run.status ?? "",
		conclusion: run.conclusion,
		headBranch: run.head_branch ?? "",
		htmlUrl: run.html_url,
		createdAt: run.created_at,
		updatedAt: run.updated_at,
	}));
}

/**
 * Get a specific workflow run by ID.
 */
export async function getWorkflowRun(
	octokit: Octokit,
	owner: string,
	repo: string,
	runId: number,
): Promise<WorkflowRun> {
	const { data: run } = await octokit.rest.actions.getWorkflowRun({
		owner,
		repo,
		run_id: runId,
	});

	return {
		id: run.id,
		name: run.name ?? "",
		status: run.status ?? "",
		conclusion: run.conclusion,
		headBranch: run.head_branch ?? "",
		htmlUrl: run.html_url,
		createdAt: run.created_at,
		updatedAt: run.updated_at,
	};
}

/**
 * Get workflow run logs (as text).
 */
export async function getWorkflowRunLogs(
	octokit: Octokit,
	owner: string,
	repo: string,
	runId: number,
): Promise<string> {
	try {
		const { url } = await octokit.rest.actions.downloadWorkflowRunLogs({
			owner,
			repo,
			run_id: runId,
		});
		return `Logs available at: ${url}`;
	} catch {
		return "Logs unavailable";
	}
}
