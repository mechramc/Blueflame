import { describe, expect, it, vi } from "vitest";
import { createPR, getPR, updatePRBody } from "./pull-requests.js";

function mockOctokit() {
	return {
		rest: {
			pulls: {
				create: vi.fn().mockResolvedValue({
					data: {
						number: 42,
						url: "https://api.github.com/repos/test/repo/pulls/42",
						html_url: "https://github.com/test/repo/pull/42",
						title: "Test PR",
						state: "open",
					},
				}),
				update: vi.fn().mockResolvedValue({}),
				get: vi.fn().mockResolvedValue({
					data: {
						number: 42,
						url: "https://api.github.com/repos/test/repo/pulls/42",
						html_url: "https://github.com/test/repo/pull/42",
						title: "Test PR",
						state: "open",
					},
				}),
			},
			issues: {
				addLabels: vi.fn().mockResolvedValue({}),
			},
		},
	} as never;
}

describe("createPR", () => {
	it("should create PR with correct params", async () => {
		const octokit = mockOctokit();
		const result = await createPR(octokit, {
			owner: "test",
			repo: "repo",
			title: "Test PR",
			body: "Description",
			head: "feature/test",
		});

		expect(result.number).toBe(42);
		expect(result.htmlUrl).toBe("https://github.com/test/repo/pull/42");
		expect(octokit.rest.pulls.create).toHaveBeenCalledWith({
			owner: "test",
			repo: "repo",
			title: "Test PR",
			body: "Description",
			head: "feature/test",
			base: "main",
			draft: false,
		});
	});

	it("should add labels when provided", async () => {
		const octokit = mockOctokit();
		await createPR(octokit, {
			owner: "test",
			repo: "repo",
			title: "Test PR",
			body: "Description",
			head: "feature/test",
			labels: ["blueflame", "automated"],
		});

		expect(octokit.rest.issues.addLabels).toHaveBeenCalledWith({
			owner: "test",
			repo: "repo",
			issue_number: 42,
			labels: ["blueflame", "automated"],
		});
	});

	it("should not add labels when not provided", async () => {
		const octokit = mockOctokit();
		await createPR(octokit, {
			owner: "test",
			repo: "repo",
			title: "Test PR",
			body: "Description",
			head: "feature/test",
		});

		expect(octokit.rest.issues.addLabels).not.toHaveBeenCalled();
	});

	it("should support draft PRs", async () => {
		const octokit = mockOctokit();
		await createPR(octokit, {
			owner: "test",
			repo: "repo",
			title: "Draft PR",
			body: "WIP",
			head: "feature/test",
			draft: true,
		});

		expect(octokit.rest.pulls.create).toHaveBeenCalledWith(
			expect.objectContaining({ draft: true }),
		);
	});
});

describe("updatePRBody", () => {
	it("should update PR description", async () => {
		const octokit = mockOctokit();
		await updatePRBody(octokit, "test", "repo", 42, "Updated body");

		expect(octokit.rest.pulls.update).toHaveBeenCalledWith({
			owner: "test",
			repo: "repo",
			pull_number: 42,
			body: "Updated body",
		});
	});
});

describe("getPR", () => {
	it("should fetch PR by number", async () => {
		const octokit = mockOctokit();
		const result = await getPR(octokit, "test", "repo", 42);

		expect(result.number).toBe(42);
		expect(result.state).toBe("open");
	});
});
