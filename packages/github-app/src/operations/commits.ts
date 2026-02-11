/**
 * Commit operations via Octokit.
 *
 * Commit files to a branch using the Git Data API (tree + commit).
 * This creates commits programmatically without needing a local clone.
 */

import type { Octokit } from "octokit";

export interface FileToCommit {
	/** File path relative to repo root */
	path: string;
	/** File content (UTF-8) */
	content: string;
}

export interface CommitParams {
	owner: string;
	repo: string;
	/** Branch to commit to */
	branch: string;
	/** Commit message */
	message: string;
	/** Files to create or update */
	files: FileToCommit[];
}

export interface CommitResult {
	sha: string;
	message: string;
	url: string;
}

/**
 * Commit multiple files to a branch using the Git Data API.
 *
 * Steps:
 * 1. Get the latest commit SHA on the branch
 * 2. Create blobs for each file
 * 3. Create a tree with the blobs
 * 4. Create a commit pointing to the tree
 * 5. Update the branch ref to the new commit
 */
export async function commitFiles(octokit: Octokit, params: CommitParams): Promise<CommitResult> {
	const { owner, repo, branch, message, files } = params;

	// 1. Get the current commit SHA for the branch
	const { data: ref } = await octokit.rest.git.getRef({
		owner,
		repo,
		ref: `heads/${branch}`,
	});
	const latestCommitSha = ref.object.sha;

	// Get the tree SHA of the current commit
	const { data: commit } = await octokit.rest.git.getCommit({
		owner,
		repo,
		commit_sha: latestCommitSha,
	});
	const baseTreeSha = commit.tree.sha;

	// 2. Create blobs for each file
	const treeItems: Array<{
		path: string;
		mode: "100644";
		type: "blob";
		sha: string;
	}> = [];

	for (const file of files) {
		const { data: blob } = await octokit.rest.git.createBlob({
			owner,
			repo,
			content: Buffer.from(file.content).toString("base64"),
			encoding: "base64",
		});

		treeItems.push({
			path: file.path,
			mode: "100644",
			type: "blob",
			sha: blob.sha,
		});
	}

	// 3. Create a tree
	const { data: tree } = await octokit.rest.git.createTree({
		owner,
		repo,
		base_tree: baseTreeSha,
		tree: treeItems,
	});

	// 4. Create a commit
	const { data: newCommit } = await octokit.rest.git.createCommit({
		owner,
		repo,
		message,
		tree: tree.sha,
		parents: [latestCommitSha],
	});

	// 5. Update the branch reference
	await octokit.rest.git.updateRef({
		owner,
		repo,
		ref: `heads/${branch}`,
		sha: newCommit.sha,
	});

	return {
		sha: newCommit.sha,
		message: newCommit.message,
		url: newCommit.url,
	};
}
