/**
 * Failure Normalizer — converts GitHub Actions webhook payloads
 * into NormalizedFailure records for the failures Cosmos container.
 *
 * Source: Blueflame-Spec-v3-ACAR.md Section 15 (CI/CD Intelligence)
 */

import { FailureSource, FailureType } from "@blueflame/shared";
import type { NormalizedFailure, TestFailureDetail, TestResults } from "@blueflame/shared";

/** Minimal GitHub workflow_run webhook payload shape */
export interface GitHubWorkflowRunPayload {
	workflow_run: {
		id: number;
		name: string;
		head_branch: string;
		head_sha: string;
		conclusion: string | null;
		run_number: number;
		html_url: string;
		run_started_at: string;
		updated_at: string;
	};
	repository: {
		full_name: string;
	};
}

/** Minimal GitHub check_run webhook payload shape */
export interface GitHubCheckRunPayload {
	check_run: {
		id: number;
		name: string;
		head_sha: string;
		conclusion: string | null;
		started_at: string;
		completed_at: string | null;
		html_url: string;
		output: {
			title: string | null;
			summary: string | null;
			text: string | null;
			annotations_count: number;
		};
	};
	repository: {
		full_name: string;
	};
}

/** Options for normalization */
export interface NormalizerOptions {
	/** Blueflame run ID that triggered this CI run */
	runId: string;
	/** Blueflame project ID */
	projectId: string;
	/** TTL in seconds (default: 30 days) */
	ttlSeconds?: number;
}

let failureSeq = 0;

function nextFailureId(runId: string): string {
	failureSeq++;
	return `FAIL-${runId}-${failureSeq}`;
}

/**
 * Classify the failure type from a GitHub conclusion.
 */
export function classifyFailureType(conclusion: string | null): FailureType {
	switch (conclusion) {
		case "failure":
			return FailureType.Build;
		case "timed_out":
			return FailureType.Timeout;
		case "cancelled":
			return FailureType.Cancelled;
		default:
			return FailureType.Unknown;
	}
}

/**
 * Extract test failure details from check run output text.
 * Parses common test runner output patterns.
 */
export function parseTestResults(outputText: string | null): TestResults | null {
	if (!outputText) return null;

	// Look for common test result patterns: "X passed, Y failed, Z skipped"
	const summaryMatch = outputText.match(/(\d+)\s+passed.*?(\d+)\s+failed(?:.*?(\d+)\s+skipped)?/i);

	if (!summaryMatch) return null;

	const passed = Number.parseInt(summaryMatch[1] ?? "0", 10);
	const failed = Number.parseInt(summaryMatch[2] ?? "0", 10);
	const skipped = Number.parseInt(summaryMatch[3] ?? "0", 10);

	// Extract individual failure details (lines with "FAIL" or "✗" or "×")
	const failureLines = outputText
		.split("\n")
		.filter((line) => line.includes("FAIL") || line.includes("\u2717") || line.includes("\u00D7"));

	const details: TestFailureDetail[] = failureLines.slice(0, 20).map((line) => ({
		testName: line.trim().slice(0, 200),
		errorMessage: line.trim().slice(0, 500),
		durationMs: 0,
	}));

	return {
		total: passed + failed + skipped,
		passed,
		failed,
		skipped,
		details,
	};
}

/**
 * Normalize a GitHub workflow_run webhook into a NormalizedFailure.
 */
export function normalizeWorkflowRun(
	payload: GitHubWorkflowRunPayload,
	options: NormalizerOptions,
): NormalizedFailure {
	const run = payload.workflow_run;
	const failureId = nextFailureId(options.runId);

	return {
		id: failureId,
		failureId,
		runId: options.runId,
		projectId: options.projectId,
		source: FailureSource.GitHubActions,
		pipelineId: String(run.id),
		buildNumber: String(run.run_number),
		failureType: classifyFailureType(run.conclusion),
		failedSteps: [],
		testResults: null,
		environment: {
			os: "ubuntu-latest",
			runtimeVersion: "unknown",
		},
		branchRef: run.head_branch,
		commitSha: run.head_sha,
		timestamp: run.updated_at,
		rawLogUrl: `${run.html_url}/logs`,
		ttl: options.ttlSeconds ?? 2592000,
	};
}

/**
 * Normalize a GitHub check_run webhook into a NormalizedFailure.
 */
export function normalizeCheckRun(
	payload: GitHubCheckRunPayload,
	options: NormalizerOptions,
): NormalizedFailure {
	const check = payload.check_run;
	const failureId = nextFailureId(options.runId);

	const testResults = parseTestResults(check.output.text);

	return {
		id: failureId,
		failureId,
		runId: options.runId,
		projectId: options.projectId,
		source: FailureSource.GitHubActions,
		pipelineId: String(check.id),
		buildNumber: check.name,
		failureType: classifyFailureType(check.conclusion),
		failedSteps: [
			{
				name: check.name,
				exitCode: check.conclusion === "failure" ? 1 : 0,
				logExcerpt: (check.output.summary ?? "").slice(0, 2000),
				durationSeconds:
					check.completed_at && check.started_at
						? (new Date(check.completed_at).getTime() - new Date(check.started_at).getTime()) / 1000
						: 0,
			},
		],
		testResults,
		environment: {
			os: "ubuntu-latest",
			runtimeVersion: "unknown",
		},
		branchRef: "",
		commitSha: check.head_sha,
		timestamp: check.completed_at ?? check.started_at,
		rawLogUrl: check.html_url,
		ttl: options.ttlSeconds ?? 2592000,
	};
}

/**
 * Reset failure sequence counter (for testing).
 */
export function resetFailureSeq(): void {
	failureSeq = 0;
}
