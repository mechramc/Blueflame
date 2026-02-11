import { describe, expect, it } from "vitest";
import {
	type ExplainerInput,
	buildExplainerPrompt,
	parseExplainerOutput,
} from "./explainer.js";

const SAMPLE_INPUT: ExplainerInput = {
	runId: "run-123",
	taskIds: ["TASK-001", "TASK-002"],
	diffs: "diff --git a/src/auth.ts b/src/auth.ts\n+export function login() {}",
	verifierResults: [
		{ criterionId: "AC-001", result: "PASS", evidence: "Test passed" },
		{ criterionId: "AC-002", result: "FAIL", evidence: "No test for JWT" },
	],
	specContext: "Build user authentication with JWT.",
	constraints: ["No third-party auth", "Use bcrypt"],
	isBugFix: false,
};

describe("buildExplainerPrompt", () => {
	it("should include run ID and task IDs", () => {
		const prompt = buildExplainerPrompt(SAMPLE_INPUT);
		expect(prompt).toContain("run-123");
		expect(prompt).toContain("TASK-001, TASK-002");
	});

	it("should include diffs", () => {
		const prompt = buildExplainerPrompt(SAMPLE_INPUT);
		expect(prompt).toContain("export function login()");
	});

	it("should include verifier results", () => {
		const prompt = buildExplainerPrompt(SAMPLE_INPUT);
		expect(prompt).toContain("AC-001");
		expect(prompt).toContain("PASS");
		expect(prompt).toContain("AC-002");
		expect(prompt).toContain("FAIL");
	});

	it("should mark bug fix type when isBugFix is true", () => {
		const input: ExplainerInput = { ...SAMPLE_INPUT, isBugFix: true };
		const prompt = buildExplainerPrompt(input);
		expect(prompt).toContain("Type: Bug Fix");
	});

	it("should mark feature type when isBugFix is false", () => {
		const prompt = buildExplainerPrompt(SAMPLE_INPUT);
		expect(prompt).toContain("Type: Feature");
	});

	it("should include constraints when provided", () => {
		const prompt = buildExplainerPrompt(SAMPLE_INPUT);
		expect(prompt).toContain("No third-party auth");
	});

	it("should omit constraints section when none provided", () => {
		const input: ExplainerInput = { ...SAMPLE_INPUT, constraints: undefined };
		const prompt = buildExplainerPrompt(input);
		expect(prompt).not.toContain("## Constraints to Check");
	});
});

describe("parseExplainerOutput", () => {
	it("should parse a valid output", () => {
		const raw = JSON.stringify({
			prTitle: "Add authentication module",
			prBody: "## Summary\nAdded auth",
			acceptanceCriteriaMap: [
				{
					criterionId: "AC-001",
					status: "SATISFIED",
					evidence: "Login function in auth.ts:10-25",
					filesChanged: ["src/auth.ts:10-25"],
				},
			],
			constraintCompliance: [
				{
					constraint: "No third-party auth",
					compliant: true,
					evidence: "No new deps in package.json",
				},
			],
			rootCauseAnalysis: null,
			summary: "Auth module added with login support",
		});

		const result = parseExplainerOutput(raw);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.prTitle).toBe("Add authentication module");
			expect(result.value.acceptanceCriteriaMap).toHaveLength(1);
			expect(result.value.acceptanceCriteriaMap[0]?.status).toBe("SATISFIED");
			expect(result.value.constraintCompliance).toHaveLength(1);
			expect(result.value.rootCauseAnalysis).toBeNull();
		}
	});

	it("should parse output with root cause analysis", () => {
		const raw = JSON.stringify({
			prTitle: "Fix auth bug",
			prBody: "## Summary\nFixed login",
			acceptanceCriteriaMap: [],
			constraintCompliance: [],
			rootCauseAnalysis: "Token validation skipped null check",
			summary: "Fixed null check in token validation",
		});

		const result = parseExplainerOutput(raw);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.rootCauseAnalysis).toBe("Token validation skipped null check");
		}
	});

	it("should handle markdown-fenced JSON", () => {
		const raw = '```json\n{"prTitle":"T","prBody":"B","acceptanceCriteriaMap":[],"constraintCompliance":[],"rootCauseAnalysis":null,"summary":"ok"}\n```';
		const result = parseExplainerOutput(raw);
		expect(result.ok).toBe(true);
	});

	it("should return error when prTitle is missing", () => {
		const raw = JSON.stringify({ prBody: "B" });
		const result = parseExplainerOutput(raw);
		expect(result.ok).toBe(false);
	});

	it("should return error when prBody is missing", () => {
		const raw = JSON.stringify({ prTitle: "T" });
		const result = parseExplainerOutput(raw);
		expect(result.ok).toBe(false);
	});

	it("should default unknown status to UNCERTAIN", () => {
		const raw = JSON.stringify({
			prTitle: "T",
			prBody: "B",
			acceptanceCriteriaMap: [
				{ criterionId: "AC-001", status: "MAYBE", evidence: "unclear", filesChanged: [] },
			],
			constraintCompliance: [],
			rootCauseAnalysis: null,
			summary: "s",
		});

		const result = parseExplainerOutput(raw);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.acceptanceCriteriaMap[0]?.status).toBe("UNCERTAIN");
		}
	});

	it("should throw on invalid JSON", () => {
		expect(() => parseExplainerOutput("not json")).toThrow();
	});
});
