/**
 * Pull request operations via Octokit.
 *
 * Create PRs, update descriptions, add labels.
 */

import type { Octokit } from "octokit";

export interface CreatePRParams {
	owner: string;
	repo: string;
	/** PR title */
	title: string;
	/** PR body (markdown) */
	body: string;
	/** Source branch */
	head: string;
	/** Target branch (default: "main") */
	base?: string;
	/** Labels to add */
	labels?: string[];
	/** Draft PR */
	draft?: boolean;
}

export interface PRResult {
	number: number;
	url: string;
	htmlUrl: string;
	title: string;
	state: string;
}

/**
 * Create a pull request.
 */
export async function createPR(
	octokit: Octokit,
	params: CreatePRParams,
): Promise<PRResult> {
	const { owner, repo, title, body, head, base = "main", draft = false } = params;

	const { data: pr } = await octokit.rest.pulls.create({
		owner,
		repo,
		title,
		body,
		head,
		base,
		draft,
	});

	// Add labels if provided
	if (params.labels && params.labels.length > 0) {
		await octokit.rest.issues.addLabels({
			owner,
			repo,
			issue_number: pr.number,
			labels: params.labels,
		});
	}

	return {
		number: pr.number,
		url: pr.url,
		htmlUrl: pr.html_url,
		title: pr.title,
		state: pr.state,
	};
}

/**
 * Update a PR description.
 */
export async function updatePRBody(
	octokit: Octokit,
	owner: string,
	repo: string,
	prNumber: number,
	body: string,
): Promise<void> {
	await octokit.rest.pulls.update({
		owner,
		repo,
		pull_number: prNumber,
		body,
	});
}

/**
 * Get a PR by number.
 */
export async function getPR(
	octokit: Octokit,
	owner: string,
	repo: string,
	prNumber: number,
): Promise<PRResult> {
	const { data: pr } = await octokit.rest.pulls.get({
		owner,
		repo,
		pull_number: prNumber,
	});

	return {
		number: pr.number,
		url: pr.url,
		htmlUrl: pr.html_url,
		title: pr.title,
		state: pr.state,
	};
}
