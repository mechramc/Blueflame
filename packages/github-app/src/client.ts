/**
 * GitHub App Octokit client.
 *
 * Creates and manages an authenticated Octokit instance
 * using GitHub App installation tokens.
 */

import { Octokit } from "octokit";
import type { GitHubAppConfig } from "./auth/installation-token.js";
import { getInstallationToken } from "./auth/installation-token.js";

export interface GitHubClientConfig extends GitHubAppConfig {
	/** Repository owner (org or user) */
	owner: string;
	/** Repository name */
	repo: string;
}

/**
 * Create an authenticated Octokit instance using the installation token.
 */
export async function createOctokitClient(
	config: GitHubClientConfig,
): Promise<Octokit> {
	const token = await getInstallationToken(config);
	return new Octokit({ auth: token });
}

/**
 * Generate a Blueflame branch name for a run/task.
 */
export function branchName(runId: string, taskId: string): string {
	return `blueflame/run-${runId}/task-${taskId}`;
}

export type { GitHubAppConfig };
