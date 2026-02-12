import { FailureSource, FailureType } from "@blueflame/shared";
import { afterEach, describe, expect, it } from "vitest";

import type { GitHubCheckRunPayload, GitHubWorkflowRunPayload } from "./failure-normalizer.js";
import {
	classifyFailureType,
	normalizeCheckRun,
	normalizeWorkflowRun,
	parseTestResults,
	resetFailureSeq,
} from "./failure-normalizer.js";

afterEach(() => {
	resetFailureSeq();
});

describe("classifyFailureType", () => {
	it("should classify 'failure' as Build", () => {
		expect(classifyFailureType("failure")).toBe(FailureType.Build);
	});

	it("should classify 'timed_out' as Timeout", () => {
		expect(classifyFailureType("timed_out")).toBe(FailureType.Timeout);
	});

	it("should classify 'cancelled' as Cancelled", () => {
		expect(classifyFailureType("cancelled")).toBe(FailureType.Cancelled);
	});

	it("should classify null as Unknown", () => {
		expect(classifyFailureType(null)).toBe(FailureType.Unknown);
	});
});

describe("parseTestResults", () => {
	it("should return null for null input", () => {
		expect(parseTestResults(null)).toBeNull();
	});

	it("should return null for text without test patterns", () => {
		expect(parseTestResults("Build completed successfully")).toBeNull();
	});

	it("should parse test summary", () => {
		const result = parseTestResults("10 passed, 2 failed, 1 skipped");
		expect(result).not.toBeNull();
		expect(result?.passed).toBe(10);
		expect(result?.failed).toBe(2);
		expect(result?.skipped).toBe(1);
		expect(result?.total).toBe(13);
	});
});

describe("normalizeWorkflowRun", () => {
	const payload: GitHubWorkflowRunPayload = {
		workflow_run: {
			id: 12345,
			name: "CI",
			head_branch: "feature/auth",
			head_sha: "abc123def456",
			conclusion: "failure",
			run_number: 42,
			html_url: "https://github.com/org/repo/actions/runs/12345",
			run_started_at: "2026-02-10T10:00:00Z",
			updated_at: "2026-02-10T10:05:00Z",
		},
		repository: { full_name: "org/repo" },
	};

	it("should produce a NormalizedFailure from workflow_run", () => {
		const failure = normalizeWorkflowRun(payload, {
			runId: "run-1",
			projectId: "proj-1",
		});

		expect(failure.source).toBe(FailureSource.GitHubActions);
		expect(failure.failureType).toBe(FailureType.Build);
		expect(failure.pipelineId).toBe("12345");
		expect(failure.buildNumber).toBe("42");
		expect(failure.branchRef).toBe("feature/auth");
		expect(failure.commitSha).toBe("abc123def456");
		expect(failure.ttl).toBe(2592000);
	});

	it("should use custom TTL", () => {
		const failure = normalizeWorkflowRun(payload, {
			runId: "run-1",
			projectId: "proj-1",
			ttlSeconds: 86400,
		});

		expect(failure.ttl).toBe(86400);
	});

	it("should generate unique failure IDs", () => {
		const f1 = normalizeWorkflowRun(payload, { runId: "run-1", projectId: "proj-1" });
		const f2 = normalizeWorkflowRun(payload, { runId: "run-1", projectId: "proj-1" });

		expect(f1.failureId).not.toBe(f2.failureId);
	});
});

describe("normalizeCheckRun", () => {
	const payload: GitHubCheckRunPayload = {
		check_run: {
			id: 67890,
			name: "vitest",
			head_sha: "abc123",
			conclusion: "failure",
			started_at: "2026-02-10T10:00:00Z",
			completed_at: "2026-02-10T10:02:30Z",
			html_url: "https://github.com/org/repo/runs/67890",
			output: {
				title: "Tests failed",
				summary: "2 test suites failed",
				text: "10 passed, 2 failed, 0 skipped\nFAIL src/auth.test.ts",
				annotations_count: 2,
			},
		},
		repository: { full_name: "org/repo" },
	};

	it("should produce a NormalizedFailure from check_run", () => {
		const failure = normalizeCheckRun(payload, {
			runId: "run-1",
			projectId: "proj-1",
		});

		expect(failure.source).toBe(FailureSource.GitHubActions);
		expect(failure.failureType).toBe(FailureType.Build);
		expect(failure.buildNumber).toBe("vitest");
		expect(failure.commitSha).toBe("abc123");
	});

	it("should extract test results from check output", () => {
		const failure = normalizeCheckRun(payload, {
			runId: "run-1",
			projectId: "proj-1",
		});

		expect(failure.testResults).not.toBeNull();
		expect(failure.testResults?.passed).toBe(10);
		expect(failure.testResults?.failed).toBe(2);
	});

	it("should compute step duration from timestamps", () => {
		const failure = normalizeCheckRun(payload, {
			runId: "run-1",
			projectId: "proj-1",
		});

		expect(failure.failedSteps).toHaveLength(1);
		expect(failure.failedSteps[0]?.durationSeconds).toBe(150); // 2.5 minutes
	});
});
