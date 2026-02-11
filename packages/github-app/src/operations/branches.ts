/**
 * Branch operations via Octokit.
 *
 * Create branches from a base ref for agent task execution.
 */

import type { Octokit } from "octokit";

export interface CreateBranchParams {
	owner: string;
	repo: string;
	/** New branch name */
	branch: string;
	/** Base branch to create from (default: "main") */
	baseBranch?: string;
}

export interface BranchResult {
	ref: string;
	sha: string;
}

/**
 * Create a new branch from a base branch.
 */
export async function createBranch(
	octokit: Octokit,
	params: CreateBranchParams,
): Promise<BranchResult> {
	const { owner, repo, branch, baseBranch = "main" } = params;

	// Get the SHA of the base branch
	const { data: baseRef } = await octokit.rest.git.getRef({
		owner,
		repo,
		ref: `heads/${baseBranch}`,
	});

	// Create the new branch
	const { data: newRef } = await octokit.rest.git.createRef({
		owner,
		repo,
		ref: `refs/heads/${branch}`,
		sha: baseRef.object.sha,
	});

	return {
		ref: newRef.ref,
		sha: newRef.object.sha,
	};
}

/**
 * Delete a branch.
 */
export async function deleteBranch(
	octokit: Octokit,
	owner: string,
	repo: string,
	branch: string,
): Promise<void> {
	await octokit.rest.git.deleteRef({
		owner,
		repo,
		ref: `heads/${branch}`,
	});
}

/**
 * Check if a branch exists.
 */
export async function branchExists(
	octokit: Octokit,
	owner: string,
	repo: string,
	branch: string,
): Promise<boolean> {
	try {
		await octokit.rest.git.getRef({
			owner,
			repo,
			ref: `heads/${branch}`,
		});
		return true;
	} catch {
		return false;
	}
}
