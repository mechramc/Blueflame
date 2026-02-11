import { describe, expect, it, vi } from "vitest";
import { branchExists, createBranch, deleteBranch } from "./branches.js";

function mockOctokit(overrides?: Record<string, unknown>) {
	return {
		rest: {
			git: {
				getRef: vi.fn().mockResolvedValue({
					data: { object: { sha: "abc123" }, ref: "refs/heads/main" },
				}),
				createRef: vi.fn().mockResolvedValue({
					data: { ref: "refs/heads/new-branch", object: { sha: "abc123" } },
				}),
				deleteRef: vi.fn().mockResolvedValue({}),
				...overrides,
			},
		},
	} as never;
}

describe("createBranch", () => {
	it("should get base branch SHA and create new ref", async () => {
		const octokit = mockOctokit();
		const result = await createBranch(octokit, {
			owner: "test",
			repo: "repo",
			branch: "feature/test",
		});

		expect(result.ref).toBe("refs/heads/new-branch");
		expect(result.sha).toBe("abc123");
		expect(octokit.rest.git.getRef).toHaveBeenCalledWith({
			owner: "test",
			repo: "repo",
			ref: "heads/main",
		});
		expect(octokit.rest.git.createRef).toHaveBeenCalledWith({
			owner: "test",
			repo: "repo",
			ref: "refs/heads/feature/test",
			sha: "abc123",
		});
	});

	it("should use custom base branch", async () => {
		const octokit = mockOctokit();
		await createBranch(octokit, {
			owner: "test",
			repo: "repo",
			branch: "feature/test",
			baseBranch: "develop",
		});

		expect(octokit.rest.git.getRef).toHaveBeenCalledWith({
			owner: "test",
			repo: "repo",
			ref: "heads/develop",
		});
	});
});

describe("deleteBranch", () => {
	it("should call deleteRef with correct params", async () => {
		const octokit = mockOctokit();
		await deleteBranch(octokit, "test", "repo", "feature/test");

		expect(octokit.rest.git.deleteRef).toHaveBeenCalledWith({
			owner: "test",
			repo: "repo",
			ref: "heads/feature/test",
		});
	});
});

describe("branchExists", () => {
	it("should return true when branch exists", async () => {
		const octokit = mockOctokit();
		const result = await branchExists(octokit, "test", "repo", "main");
		expect(result).toBe(true);
	});

	it("should return false when branch does not exist", async () => {
		const octokit = mockOctokit({
			getRef: vi.fn().mockRejectedValue(new Error("Not Found")),
		});
		const result = await branchExists(octokit, "test", "repo", "nonexistent");
		expect(result).toBe(false);
	});
});
