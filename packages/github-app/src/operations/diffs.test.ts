import { describe, expect, it, vi } from "vitest";
import { compareCommits, formatDiff, getPRDiff } from "./diffs.js";
import type { DiffResult } from "./diffs.js";

const MOCK_FILES = [
	{
		filename: "src/auth.ts",
		status: "added",
		additions: 45,
		deletions: 0,
		changes: 45,
		patch: "@@ +1,45 @@\n+export function login() {}",
	},
	{
		filename: "src/index.ts",
		status: "modified",
		additions: 3,
		deletions: 1,
		changes: 4,
		patch: "@@ -1,5 +1,7 @@\n-old line\n+new line",
	},
];

function mockOctokit() {
	return {
		rest: {
			pulls: {
				listFiles: vi.fn().mockResolvedValue({ data: MOCK_FILES }),
			},
			repos: {
				compareCommits: vi.fn().mockResolvedValue({
					data: { files: MOCK_FILES },
				}),
			},
		},
	} as never;
}

describe("getPRDiff", () => {
	it("should return file diffs for a PR", async () => {
		const octokit = mockOctokit();
		const result = await getPRDiff(octokit, "test", "repo", 42);

		expect(result.files).toHaveLength(2);
		expect(result.totalAdditions).toBe(48);
		expect(result.totalDeletions).toBe(1);
		expect(result.totalChanges).toBe(49);
	});

	it("should include patch content", async () => {
		const octokit = mockOctokit();
		const result = await getPRDiff(octokit, "test", "repo", 42);

		expect(result.files[0]?.patch).toContain("export function login()");
	});
});

describe("compareCommits", () => {
	it("should return diff between two commits", async () => {
		const octokit = mockOctokit();
		const result = await compareCommits(
			octokit,
			"test",
			"repo",
			"main",
			"feature/test",
		);

		expect(result.files).toHaveLength(2);
		expect(octokit.rest.repos.compareCommits).toHaveBeenCalledWith({
			owner: "test",
			repo: "repo",
			base: "main",
			head: "feature/test",
		});
	});
});

describe("formatDiff", () => {
	it("should format diff into readable string", () => {
		const diff: DiffResult = {
			files: [
				{
					filename: "src/auth.ts",
					status: "added",
					additions: 10,
					deletions: 0,
					changes: 10,
					patch: "+export function login() {}",
				},
			],
			totalAdditions: 10,
			totalDeletions: 0,
			totalChanges: 10,
		};

		const formatted = formatDiff(diff);
		expect(formatted).toContain("Files changed: 1");
		expect(formatted).toContain("Additions: +10");
		expect(formatted).toContain("Deletions: -0");
		expect(formatted).toContain("src/auth.ts (added)");
		expect(formatted).toContain("export function login()");
	});

	it("should handle multiple files", () => {
		const diff: DiffResult = {
			files: [
				{ filename: "a.ts", status: "added", additions: 5, deletions: 0, changes: 5, patch: "+a" },
				{ filename: "b.ts", status: "modified", additions: 3, deletions: 2, changes: 5, patch: "-b\n+c" },
			],
			totalAdditions: 8,
			totalDeletions: 2,
			totalChanges: 10,
		};

		const formatted = formatDiff(diff);
		expect(formatted).toContain("Files changed: 2");
		expect(formatted).toContain("a.ts (added)");
		expect(formatted).toContain("b.ts (modified)");
	});
});
