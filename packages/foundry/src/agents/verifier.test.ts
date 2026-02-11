import { describe, expect, it } from "vitest";
import { type VerifierInput, buildVerifierPrompt, parseVerifierOutput } from "./verifier.js";

const SAMPLE_INPUT: VerifierInput = {
	taskId: "TASK-001",
	acceptanceCriteria: [
		{ id: "AC-001", description: "User can log in with email/password" },
		{ id: "AC-002", description: "JWT token is returned on success" },
	],
	ciOutput: "PASS auth.test.ts > should authenticate user\nPASS auth.test.ts > should return JWT",
	buildPassed: true,
	builderNotes: "Implemented using bcrypt",
	diffSummary: "Added src/auth.ts (+45 lines)",
};

describe("buildVerifierPrompt", () => {
	it("should include task ID", () => {
		const prompt = buildVerifierPrompt(SAMPLE_INPUT);
		expect(prompt).toContain("TASK-001");
	});

	it("should include acceptance criteria", () => {
		const prompt = buildVerifierPrompt(SAMPLE_INPUT);
		expect(prompt).toContain("AC-001");
		expect(prompt).toContain("User can log in with email/password");
		expect(prompt).toContain("AC-002");
	});

	it("should include build status", () => {
		const prompt = buildVerifierPrompt(SAMPLE_INPUT);
		expect(prompt).toContain("Build Status: PASSED");
	});

	it("should show FAILED for failed build", () => {
		const input: VerifierInput = { ...SAMPLE_INPUT, buildPassed: false };
		const prompt = buildVerifierPrompt(input);
		expect(prompt).toContain("Build Status: FAILED");
	});

	it("should include CI output", () => {
		const prompt = buildVerifierPrompt(SAMPLE_INPUT);
		expect(prompt).toContain("should authenticate user");
	});

	it("should include builder notes when provided", () => {
		const prompt = buildVerifierPrompt(SAMPLE_INPUT);
		expect(prompt).toContain("Implemented using bcrypt");
	});

	it("should omit builder notes when not provided", () => {
		const input: VerifierInput = { ...SAMPLE_INPUT, builderNotes: undefined };
		const prompt = buildVerifierPrompt(input);
		expect(prompt).not.toContain("## Builder Notes");
	});

	it("should include diff summary when provided", () => {
		const prompt = buildVerifierPrompt(SAMPLE_INPUT);
		expect(prompt).toContain("Added src/auth.ts (+45 lines)");
	});
});

describe("parseVerifierOutput", () => {
	it("should parse a PASS result", () => {
		const raw = JSON.stringify({
			taskId: "TASK-001",
			overallResult: "PASS",
			criteria: [
				{ id: "AC-001", result: "PASS", evidence: "Test passed", notes: "" },
				{ id: "AC-002", result: "PASS", evidence: "JWT returned", notes: "" },
			],
			buildPassed: true,
			testsPassed: 2,
			testsFailed: 0,
			lintErrors: 0,
			summary: "All criteria met",
		});

		const result = parseVerifierOutput(raw);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.overallResult).toBe("PASS");
			expect(result.value.criteria).toHaveLength(2);
			expect(result.value.testsPassed).toBe(2);
		}
	});

	it("should parse a PARTIAL result", () => {
		const raw = JSON.stringify({
			taskId: "TASK-001",
			overallResult: "PARTIAL",
			criteria: [
				{ id: "AC-001", result: "PASS", evidence: "passed", notes: "" },
				{ id: "AC-002", result: "FAIL", evidence: "no evidence", notes: "" },
			],
			buildPassed: true,
			testsPassed: 1,
			testsFailed: 1,
			lintErrors: 0,
			summary: "Partial success",
		});

		const result = parseVerifierOutput(raw);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.overallResult).toBe("PARTIAL");
			expect(result.value.criteria[0]?.result).toBe("PASS");
			expect(result.value.criteria[1]?.result).toBe("FAIL");
		}
	});

	it("should parse an error response", () => {
		const raw = JSON.stringify({
			taskId: "TASK-001",
			overallResult: "FAIL",
			error: "CI output unavailable",
		});

		const result = parseVerifierOutput(raw);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.error).toBe("CI output unavailable");
		}
	});

	it("should handle markdown-fenced JSON", () => {
		const raw =
			'```json\n{"taskId":"T","overallResult":"PASS","criteria":[],"buildPassed":true,"testsPassed":0,"testsFailed":0,"lintErrors":0,"summary":"ok"}\n```';
		const result = parseVerifierOutput(raw);
		expect(result.ok).toBe(true);
	});

	it("should fail on invalid overallResult", () => {
		const raw = JSON.stringify({
			taskId: "TASK-001",
			overallResult: "UNKNOWN",
			criteria: [],
		});

		const result = parseVerifierOutput(raw);
		expect(result.ok).toBe(false);
	});

	it("should default criterion result to FAIL for non-PASS values", () => {
		const raw = JSON.stringify({
			taskId: "TASK-001",
			overallResult: "FAIL",
			criteria: [{ id: "AC-001", result: "MAYBE", evidence: "unclear", notes: "" }],
			buildPassed: false,
			testsPassed: 0,
			testsFailed: 1,
			lintErrors: 0,
			summary: "Failed",
		});

		const result = parseVerifierOutput(raw);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.criteria[0]?.result).toBe("FAIL");
		}
	});

	it("should throw on invalid JSON", () => {
		expect(() => parseVerifierOutput("not json")).toThrow();
	});
});
