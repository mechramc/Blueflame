/**
 * Diff operations via Octokit.
 *
 * Read PR diffs and compare commits for the Explainer agent.
 */

import type { Octokit } from "octokit";

export interface FileDiff {
	filename: string;
	status: string;
	additions: number;
	deletions: number;
	changes: number;
	patch: string;
}

export interface DiffResult {
	files: FileDiff[];
	totalAdditions: number;
	totalDeletions: number;
	totalChanges: number;
}

/**
 * Get the diff for a pull request.
 */
export async function getPRDiff(
	octokit: Octokit,
	owner: string,
	repo: string,
	prNumber: number,
): Promise<DiffResult> {
	const { data: files } = await octokit.rest.pulls.listFiles({
		owner,
		repo,
		pull_number: prNumber,
		per_page: 100,
	});

	const fileDiffs: FileDiff[] = files.map((f) => ({
		filename: f.filename,
		status: f.status,
		additions: f.additions,
		deletions: f.deletions,
		changes: f.changes,
		patch: f.patch ?? "",
	}));

	return {
		files: fileDiffs,
		totalAdditions: fileDiffs.reduce((sum, f) => sum + f.additions, 0),
		totalDeletions: fileDiffs.reduce((sum, f) => sum + f.deletions, 0),
		totalChanges: fileDiffs.reduce((sum, f) => sum + f.changes, 0),
	};
}

/**
 * Compare two commits and get the diff.
 */
export async function compareCommits(
	octokit: Octokit,
	owner: string,
	repo: string,
	base: string,
	head: string,
): Promise<DiffResult> {
	const { data } = await octokit.rest.repos.compareCommits({
		owner,
		repo,
		base,
		head,
	});

	const fileDiffs: FileDiff[] = (data.files ?? []).map((f) => ({
		filename: f.filename,
		status: f.status,
		additions: f.additions,
		deletions: f.deletions,
		changes: f.changes,
		patch: f.patch ?? "",
	}));

	return {
		files: fileDiffs,
		totalAdditions: fileDiffs.reduce((sum, f) => sum + f.additions, 0),
		totalDeletions: fileDiffs.reduce((sum, f) => sum + f.deletions, 0),
		totalChanges: fileDiffs.reduce((sum, f) => sum + f.changes, 0),
	};
}

/**
 * Format a DiffResult into a human-readable string for the Explainer agent.
 */
export function formatDiff(diff: DiffResult): string {
	const lines: string[] = [
		`Files changed: ${diff.files.length}`,
		`Additions: +${diff.totalAdditions}`,
		`Deletions: -${diff.totalDeletions}`,
		"",
	];

	for (const file of diff.files) {
		lines.push(`--- ${file.filename} (${file.status}) +${file.additions}/-${file.deletions}`);
		if (file.patch) {
			lines.push(file.patch);
			lines.push("");
		}
	}

	return lines.join("\n");
}
