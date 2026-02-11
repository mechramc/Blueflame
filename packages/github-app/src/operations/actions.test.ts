import { describe, expect, it, vi } from "vitest";
import { getWorkflowRun, getWorkflowRuns, triggerWorkflow } from "./actions.js";

function mockOctokit() {
	return {
		rest: {
			actions: {
				createWorkflowDispatch: vi.fn().mockResolvedValue({}),
				listWorkflowRunsForRepo: vi.fn().mockResolvedValue({
					data: {
						workflow_runs: [
							{
								id: 1001,
								name: "CI",
								status: "completed",
								conclusion: "success",
								head_branch: "feature/test",
								html_url: "https://github.com/test/repo/actions/runs/1001",
								created_at: "2026-02-11T10:00:00Z",
								updated_at: "2026-02-11T10:05:00Z",
							},
							{
								id: 1002,
								name: "CI",
								status: "completed",
								conclusion: "failure",
								head_branch: "feature/test",
								html_url: "https://github.com/test/repo/actions/runs/1002",
								created_at: "2026-02-11T09:00:00Z",
								updated_at: "2026-02-11T09:03:00Z",
							},
						],
					},
				}),
				getWorkflowRun: vi.fn().mockResolvedValue({
					data: {
						id: 1001,
						name: "CI",
						status: "completed",
						conclusion: "success",
						head_branch: "feature/test",
						html_url: "https://github.com/test/repo/actions/runs/1001",
						created_at: "2026-02-11T10:00:00Z",
						updated_at: "2026-02-11T10:05:00Z",
					},
				}),
			},
		},
	} as never;
}

describe("triggerWorkflow", () => {
	it("should dispatch workflow with correct params", async () => {
		const octokit = mockOctokit();
		await triggerWorkflow(octokit, {
			owner: "test",
			repo: "repo",
			workflowId: "ci.yml",
			ref: "feature/test",
			inputs: { environment: "staging" },
		});

		expect(octokit.rest.actions.createWorkflowDispatch).toHaveBeenCalledWith({
			owner: "test",
			repo: "repo",
			workflow_id: "ci.yml",
			ref: "feature/test",
			inputs: { environment: "staging" },
		});
	});
});

describe("getWorkflowRuns", () => {
	it("should return workflow runs for a branch", async () => {
		const octokit = mockOctokit();
		const runs = await getWorkflowRuns(octokit, "test", "repo", "feature/test");

		expect(runs).toHaveLength(2);
		expect(runs[0]?.id).toBe(1001);
		expect(runs[0]?.conclusion).toBe("success");
		expect(runs[1]?.conclusion).toBe("failure");
	});

	it("should pass limit parameter", async () => {
		const octokit = mockOctokit();
		await getWorkflowRuns(octokit, "test", "repo", "feature/test", 10);

		expect(octokit.rest.actions.listWorkflowRunsForRepo).toHaveBeenCalledWith({
			owner: "test",
			repo: "repo",
			branch: "feature/test",
			per_page: 10,
		});
	});
});

describe("getWorkflowRun", () => {
	it("should return a specific workflow run", async () => {
		const octokit = mockOctokit();
		const run = await getWorkflowRun(octokit, "test", "repo", 1001);

		expect(run.id).toBe(1001);
		expect(run.status).toBe("completed");
		expect(run.conclusion).toBe("success");
	});
});
