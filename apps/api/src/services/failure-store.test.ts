import { describe, it, expect, beforeEach } from "vitest";
import { FailureSource, FailureType } from "@blueflame/shared";
import type { NormalizedFailure } from "@blueflame/shared";
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

describe("failure-store", () => {
	beforeEach(() => {
		clearAllFailures();
	});

	it("should store and retrieve a failure by ID", () => {
		const failure = makeFailure();
		storeFailure(failure);
		expect(getFailure("FAIL-1-123")).toEqual(failure);
	});

	it("should return undefined for non-existent failure", () => {
		expect(getFailure("nonexistent")).toBeUndefined();
	});

	it("should get failures by runId", () => {
		storeFailure(makeFailure({ failureId: "f1", runId: "run-A" }));
		storeFailure(makeFailure({ failureId: "f2", runId: "run-A" }));
		storeFailure(makeFailure({ failureId: "f3", runId: "run-B" }));

		const results = getFailuresByRunId("run-A");
		expect(results).toHaveLength(2);
		expect(results.every((f) => f.runId === "run-A")).toBe(true);
	});

	it("should get failures by projectId", () => {
		storeFailure(makeFailure({ failureId: "f1", projectId: "proj-X" }));
		storeFailure(makeFailure({ failureId: "f2", projectId: "proj-Y" }));

		const results = getFailuresByProjectId("proj-X");
		expect(results).toHaveLength(1);
		expect(results[0].projectId).toBe("proj-X");
	});

	it("should return empty array when no failures match", () => {
		expect(getFailuresByRunId("no-match")).toEqual([]);
		expect(getFailuresByProjectId("no-match")).toEqual([]);
	});

	it("should return all failures", () => {
		storeFailure(makeFailure({ failureId: "f1" }));
		storeFailure(makeFailure({ failureId: "f2" }));
		expect(getAllFailures()).toHaveLength(2);
	});

	it("should clear all failures", () => {
		storeFailure(makeFailure({ failureId: "f1" }));
		storeFailure(makeFailure({ failureId: "f2" }));
		clearAllFailures();
		expect(getAllFailures()).toHaveLength(0);
	});
});
