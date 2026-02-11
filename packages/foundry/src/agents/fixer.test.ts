import { describe, it, expect } from "vitest";
import { FailureSource, FailureType } from "@blueflame/shared";
import type { NormalizedFailure } from "@blueflame/shared";
import { buildFixerPrompt, parseFixerOutput } from "./fixer.js";

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
		environment: { os: "ubuntu-latest", runtimeVersion: "node-20" },
		branchRef: "refs/heads/main",
		commitSha: "abc123",
		timestamp: new Date().toISOString(),
		rawLogUrl: "https://dev.azure.com/logs",
		ttl: 2592000,
		...overrides,
	};
}

describe("Fixer Agent — buildFixerPrompt", () => {
	it("should include failure metadata", () => {
		const failure = makeFailure();
		const prompt = buildFixerPrompt(failure);
		expect(prompt).toContain("FAIL-1-123");
		expect(prompt).toContain("azure-devops");
		expect(prompt).toContain("build");
		expect(prompt).toContain("pipe-1");
		expect(prompt).toContain("Build #42");
		expect(prompt).toContain("refs/heads/main");
		expect(prompt).toContain("abc123");
	});

	it("should include failed steps with log excerpts", () => {
		const failure = makeFailure({
			failedSteps: [
				{ name: "npm test", exitCode: 1, logExcerpt: "FAIL src/auth.test.ts", durationSeconds: 30 },
			],
		});
		const prompt = buildFixerPrompt(failure);
		expect(prompt).toContain("npm test");
		expect(prompt).toContain("exit code: 1");
		expect(prompt).toContain("FAIL src/auth.test.ts");
	});

	it("should include test results", () => {
		const failure = makeFailure({
			testResults: {
				total: 50,
				passed: 45,
				failed: 5,
				skipped: 0,
				details: [{ testName: "auth.test.ts > login", errorMessage: "Expected 200 got 401", durationMs: 100 }],
			},
		});
		const prompt = buildFixerPrompt(failure);
		expect(prompt).toContain("Total: 50");
		expect(prompt).toContain("Failed: 5");
		expect(prompt).toContain("auth.test.ts > login");
	});

	it("should include raw log URL", () => {
		const prompt = buildFixerPrompt(makeFailure());
		expect(prompt).toContain("https://dev.azure.com/logs");
	});
});

describe("Fixer Agent — parseFixerOutput", () => {
	it("should parse valid JSON response", () => {
		const raw = JSON.stringify({
			failureId: "FAIL-1-123",
			summary: "TypeScript compilation error",
			rootCause: "Missing import in auth module",
			confidence: 0.9,
			affectedFiles: ["src/auth.ts"],
			remediationTasks: [
				{
					id: "REM-001",
					description: "Add missing import",
					estimatedSigma: 1,
					estimatedCost: 0.05,
					agentRole: "BUILDER",
				},
			],
		});

		const result = parseFixerOutput(raw, "FAIL-1-123");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.failureId).toBe("FAIL-1-123");
			expect(result.value.rootCause.summary).toBe("TypeScript compilation error");
			expect(result.value.rootCause.confidence).toBe(0.9);
			expect(result.value.rootCause.affectedFiles).toEqual(["src/auth.ts"]);
			expect(result.value.rootCause.remediationTasks).toHaveLength(1);
			expect(result.value.rootCause.remediationTasks[0].id).toBe("REM-001");
		}
	});

	it("should strip markdown code fences", () => {
		const raw = `\`\`\`json
{
  "failureId": "FAIL-2",
  "summary": "Test failure",
  "rootCause": "Missing mock",
  "confidence": 0.7,
  "affectedFiles": [],
  "remediationTasks": []
}
\`\`\``;

		const result = parseFixerOutput(raw, "FAIL-2");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.rootCause.summary).toBe("Test failure");
		}
	});

	it("should use fallback failureId when not in response", () => {
		const raw = JSON.stringify({
			summary: "No failureId in response",
			rootCause: "unknown",
			confidence: 0.5,
		});

		const result = parseFixerOutput(raw, "FAIL-fallback");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.failureId).toBe("FAIL-fallback");
		}
	});

	it("should handle missing remediationTasks gracefully", () => {
		const raw = JSON.stringify({
			failureId: "FAIL-3",
			summary: "Flaky test",
			rootCause: "Network timeout in test",
			confidence: 0.4,
			affectedFiles: [],
		});

		const result = parseFixerOutput(raw, "FAIL-3");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.rootCause.remediationTasks).toEqual([]);
		}
	});

	it("should default sigma to 3 when missing", () => {
		const raw = JSON.stringify({
			failureId: "FAIL-4",
			summary: "s",
			rootCause: "r",
			confidence: 0.5,
			affectedFiles: [],
			remediationTasks: [{ id: "R1", description: "Fix it", agentRole: "BUILDER" }],
		});

		const result = parseFixerOutput(raw, "FAIL-4");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.rootCause.remediationTasks[0].estimatedSigma).toBe(3);
		}
	});
});
