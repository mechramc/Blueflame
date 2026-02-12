import { describe, expect, it } from "vitest";

import {
	type IAdoClient,
	PipelineRunStatus,
	RealAdoClient,
	SimulatedAdoClient,
	createAdoClientFromEnv,
} from "./ado-client.js";

function createTestClient(): IAdoClient {
	return new SimulatedAdoClient({
		orgUrl: "https://dev.azure.com/testorg",
		pat: "test-pat-token",
		project: "TestProject",
	});
}

describe("SimulatedAdoClient", () => {
	it("should store config", () => {
		const client = createTestClient();
		expect(client.getOrgUrl()).toBe("https://dev.azure.com/testorg");
		expect(client.getProject()).toBe("TestProject");
		expect(client.isReal()).toBe(false);
	});

	it("should trigger a pipeline run", async () => {
		const client = createTestClient();
		const run = await client.triggerPipeline({ pipelineId: 42, branch: "refs/heads/main" });

		expect(run.pipelineId).toBe(42);
		expect(run.status).toBe(PipelineRunStatus.NotStarted);
		expect(run.result).toBeNull();
		expect(run.url).toContain("dev.azure.com/testorg");
	});

	it("should get pipeline run by ID", async () => {
		const client = createTestClient();
		const run = await client.triggerPipeline({ pipelineId: 42, branch: "refs/heads/main" });
		const fetched = await client.getPipelineRun(run.id);

		expect(fetched).not.toBeNull();
		expect(fetched?.id).toBe(run.id);
	});

	it("should return null for unknown pipeline run", async () => {
		const client = createTestClient();
		expect(await client.getPipelineRun(99999)).toBeNull();
	});

	it("should list pipeline runs filtered by pipelineId", async () => {
		const client = createTestClient();
		await client.triggerPipeline({ pipelineId: 42, branch: "main" });
		await client.triggerPipeline({ pipelineId: 42, branch: "dev" });
		await client.triggerPipeline({ pipelineId: 99, branch: "main" });

		const runs = await client.listPipelineRuns(42);
		expect(runs).toHaveLength(2);
		expect(runs.every((r) => r.pipelineId === 42)).toBe(true);
	});

	it("should create a work item", async () => {
		const client = createTestClient();
		const item = await client.createWorkItem({
			type: "Bug",
			title: "CI failure in build pipeline",
			description: "The build pipeline failed on step 3",
		});

		expect(item.type).toBe("Bug");
		expect(item.title).toBe("CI failure in build pipeline");
		expect(item.url).toContain("dev.azure.com/testorg");
	});

	it("should get work item by ID", async () => {
		const client = createTestClient();
		const item = await client.createWorkItem({
			type: "Task",
			title: "Fix flaky test",
			description: "Test intermittently fails",
		});

		const fetched = await client.getWorkItem(item.id);
		expect(fetched).not.toBeNull();
		expect(fetched?.title).toBe("Fix flaky test");
	});

	it("should return null for unknown work item", async () => {
		const client = createTestClient();
		expect(await client.getWorkItem(99999)).toBeNull();
	});
});

describe("RealAdoClient", () => {
	it("should report isReal as true", () => {
		const client = new RealAdoClient({
			orgUrl: "https://dev.azure.com/testorg",
			pat: "test-pat",
			project: "TestProject",
		});
		expect(client.isReal()).toBe(true);
		expect(client.getOrgUrl()).toBe("https://dev.azure.com/testorg");
		expect(client.getProject()).toBe("TestProject");
	});
});

describe("createAdoClientFromEnv", () => {
	it("should return null when ADO_ORG_URL is not set", () => {
		// env vars not set in test environment
		const client = createAdoClientFromEnv();
		expect(client).toBeNull();
	});
});
