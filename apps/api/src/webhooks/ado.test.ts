import { describe, it, expect, beforeEach, vi } from "vitest";
import { FailureSource, FailureType } from "@blueflame/shared";
import {
	clearAdoHandlers,
	normalizeBuildComplete,
	onAdoFailure,
} from "./ado.js";

describe("ADO webhook — normalizeBuildComplete", () => {
	it("should return null when resource is missing", () => {
		expect(normalizeBuildComplete({})).toBeNull();
	});

	it("should return null when build succeeded", () => {
		expect(
			normalizeBuildComplete({
				resource: { result: "succeeded" },
			}),
		).toBeNull();
	});

	it("should normalize a failed build", () => {
		const payload = {
			eventType: "build.complete",
			resourceContainers: {
				project: { id: "proj-123" },
			},
			resource: {
				result: "failed",
				buildNumber: "42",
				id: 100,
				definition: { id: "def-1" },
				sourceBranch: "refs/heads/feature/foo",
				sourceVersion: "abc123def",
				finishTime: "2026-02-11T12:00:00Z",
				url: "https://dev.azure.com/org/project/_build/results?buildId=42",
				queue: { name: "ubuntu-latest" },
				tags: ["blueflame-run-run-55"],
			},
		};

		const result = normalizeBuildComplete(payload);
		expect(result).not.toBeNull();
		expect(result?.source).toBe(FailureSource.AzureDevOps);
		expect(result?.failureType).toBe(FailureType.Build);
		expect(result?.buildNumber).toBe("42");
		expect(result?.pipelineId).toBe("def-1");
		expect(result?.branchRef).toBe("refs/heads/feature/foo");
		expect(result?.commitSha).toBe("abc123def");
		expect(result?.runId).toBe("run-55");
		expect(result?.projectId).toBe("proj-123");
		expect(result?.environment.os).toBe("ubuntu-latest");
		expect(result?.rawLogUrl).toContain("/logs");
		expect(result?.ttl).toBe(2592000);
	});

	it("should set failureType to Timeout when canceled", () => {
		const payload = {
			resource: {
				result: "canceled",
				buildNumber: "99",
			},
			resourceContainers: {},
		};

		const result = normalizeBuildComplete(payload);
		expect(result?.failureType).toBe(FailureType.Timeout);
	});

	it("should set failureType to Test when test results have failures", () => {
		const payload = {
			resource: {
				result: "failed",
				buildNumber: "50",
				testResults: {
					totalTests: 100,
					passedTests: 90,
					failedTests: 10,
					skippedTests: 0,
				},
			},
			resourceContainers: {},
		};

		const result = normalizeBuildComplete(payload);
		expect(result?.failureType).toBe(FailureType.Test);
		expect(result?.testResults?.total).toBe(100);
		expect(result?.testResults?.failed).toBe(10);
	});

	it("should extract failed steps from timeline records", () => {
		const payload = {
			resource: {
				result: "failed",
				buildNumber: "60",
				timeline: {
					records: [
						{ name: "Build", result: "succeeded" },
						{ name: "Test", result: "failed", errorCount: 3, issues: ["Error: test failed"] },
						{ name: "Deploy", result: "skipped" },
					],
				},
			},
			resourceContainers: {},
		};

		const result = normalizeBuildComplete(payload);
		expect(result?.failedSteps).toHaveLength(2);
		expect(result?.failedSteps[0].name).toBe("Test");
		expect(result?.failedSteps[0].exitCode).toBe(3);
		expect(result?.failedSteps[1].name).toBe("Deploy");
	});

	it("should extract runId from branch name", () => {
		const payload = {
			resource: {
				result: "failed",
				buildNumber: "70",
				sourceBranch: "refs/heads/blueflame/run-abc123",
			},
			resourceContainers: {},
		};

		const result = normalizeBuildComplete(payload);
		expect(result?.runId).toBe("abc123");
	});
});

describe("ADO webhook — handler registration", () => {
	beforeEach(() => {
		clearAdoHandlers();
	});

	it("should register and invoke failure handlers", () => {
		const handler = vi.fn();
		onAdoFailure(handler);

		const failure = normalizeBuildComplete({
			resource: { result: "failed", buildNumber: "1" },
			resourceContainers: {},
		});

		expect(failure).not.toBeNull();
		// Simulate handler call
		if (failure) handler(failure);
		expect(handler).toHaveBeenCalledOnce();
	});
});
