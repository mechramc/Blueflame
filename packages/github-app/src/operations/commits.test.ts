import { describe, expect, it, vi } from "vitest";
import { commitFiles } from "./commits.js";

function mockOctokit() {
	return {
		rest: {
			git: {
				getRef: vi.fn().mockResolvedValue({
					data: { object: { sha: "base-sha-123" } },
				}),
				getCommit: vi.fn().mockResolvedValue({
					data: { tree: { sha: "tree-sha-123" } },
				}),
				createBlob: vi.fn().mockResolvedValue({
					data: { sha: "blob-sha-123" },
				}),
				createTree: vi.fn().mockResolvedValue({
					data: { sha: "new-tree-sha-123" },
				}),
				createCommit: vi.fn().mockResolvedValue({
					data: {
						sha: "new-commit-sha-123",
						message: "test commit",
						url: "https://api.github.com/repos/test/repo/git/commits/new-commit-sha-123",
					},
				}),
				updateRef: vi.fn().mockResolvedValue({}),
			},
		},
	} as never;
}

describe("commitFiles", () => {
	it("should create blobs, tree, commit, and update ref", async () => {
		const octokit = mockOctokit();
		const result = await commitFiles(octokit, {
			owner: "test",
			repo: "repo",
			branch: "feature/test",
			message: "test commit",
			files: [{ path: "src/hello.ts", content: 'console.log("hello")' }],
		});

		expect(result.sha).toBe("new-commit-sha-123");
		expect(result.message).toBe("test commit");

		// Verify the correct API call sequence
		expect(octokit.rest.git.getRef).toHaveBeenCalledWith({
			owner: "test",
			repo: "repo",
			ref: "heads/feature/test",
		});
		expect(octokit.rest.git.getCommit).toHaveBeenCalledWith({
			owner: "test",
			repo: "repo",
			commit_sha: "base-sha-123",
		});
		expect(octokit.rest.git.createBlob).toHaveBeenCalledTimes(1);
		expect(octokit.rest.git.createTree).toHaveBeenCalledWith({
			owner: "test",
			repo: "repo",
			base_tree: "tree-sha-123",
			tree: [
				{
					path: "src/hello.ts",
					mode: "100644",
					type: "blob",
					sha: "blob-sha-123",
				},
			],
		});
		expect(octokit.rest.git.createCommit).toHaveBeenCalledWith({
			owner: "test",
			repo: "repo",
			message: "test commit",
			tree: "new-tree-sha-123",
			parents: ["base-sha-123"],
		});
		expect(octokit.rest.git.updateRef).toHaveBeenCalledWith({
			owner: "test",
			repo: "repo",
			ref: "heads/feature/test",
			sha: "new-commit-sha-123",
		});
	});

	it("should handle multiple files", async () => {
		const octokit = mockOctokit();
		await commitFiles(octokit, {
			owner: "test",
			repo: "repo",
			branch: "feature/test",
			message: "multi-file commit",
			files: [
				{ path: "src/a.ts", content: "a" },
				{ path: "src/b.ts", content: "b" },
				{ path: "src/c.ts", content: "c" },
			],
		});

		expect(octokit.rest.git.createBlob).toHaveBeenCalledTimes(3);
	});
});
