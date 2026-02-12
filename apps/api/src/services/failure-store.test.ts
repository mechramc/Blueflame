import { FailureSource, FailureType } from "@blueflame/shared";
import type { NormalizedFailure } from "@blueflame/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../db.js");

import { clearAllMockStores } from "../__mocks__/db.js";
import {
	clearAllFailures,
	getAllFailures,
	getFailure,
	getFailuresByProjectId,
	getFailuresByRunId,
	storeFailure,
} from "./failure-store.js";

function makeFailure(overrides: Partial<NormalizedFailure> = {}): NormalizedFailure {
	return {
		id: "FAIL-1-123",
		failureId: "FAIL-1-123",
		runId: "run-1",
		projectId: "proj-1",
		source: FailureSource.AzureDevOps,
		pipelineId: "pipe-1",
		buildNumber: "42",
		failureType: FailureType.Build,
		failedSteps: [],
		testResults: null,
		environment: { os: "hosted", runtimeVersion: "unknown" },
		branchRef: "refs/heads/main",
		commitSha: "abc123",
		timestamp: new Date().toISOString(),
		rawLogUrl: "",
		ttl: 2592000,
		...overrides,
	};
}

afterEach(() => {
	clearAllFailures();
	clearAllMockStores();
});

describe("failure-store", () => {
	it("should store and retrieve a failure by ID", async () => {
		const failure = makeFailure();
		await storeFailure(failure);
		const retrieved = await getFailure("FAIL-1-123");
		expect(retrieved).toEqual(failure);
	});

	it("should return undefined for non-existent failure", async () => {
		expect(await getFailure("nonexistent")).toBeUndefined();
	});

	it("should get failures by runId", async () => {
		await storeFailure(makeFailure({ id: "f1", failureId: "f1", runId: "run-A" }));
		await storeFailure(makeFailure({ id: "f2", failureId: "f2", runId: "run-A" }));
		await storeFailure(makeFailure({ id: "f3", failureId: "f3", runId: "run-B" }));

		const results = await getFailuresByRunId("run-A");
		expect(results).toHaveLength(2);
		expect(results.every((f) => f.runId === "run-A")).toBe(true);
	});

	it("should get failures by projectId", async () => {
		await storeFailure(makeFailure({ id: "f1", failureId: "f1", projectId: "proj-X" }));
		await storeFailure(makeFailure({ id: "f2", failureId: "f2", projectId: "proj-Y" }));

		const results = await getFailuresByProjectId("proj-X");
		expect(results).toHaveLength(1);
		expect(results[0].projectId).toBe("proj-X");
	});

	it("should return empty array when no failures match", async () => {
		expect(await getFailuresByRunId("no-match")).toEqual([]);
		expect(await getFailuresByProjectId("no-match")).toEqual([]);
	});

	it("should return all failures", async () => {
		await storeFailure(makeFailure({ id: "f1", failureId: "f1" }));
		await storeFailure(makeFailure({ id: "f2", failureId: "f2" }));
		expect(await getAllFailures()).toHaveLength(2);
	});

	it("should clear all failures via mock store reset", async () => {
		await storeFailure(makeFailure({ id: "f1", failureId: "f1" }));
		await storeFailure(makeFailure({ id: "f2", failureId: "f2" }));
		clearAllMockStores();
		expect(await getAllFailures()).toHaveLength(0);
	});
});
