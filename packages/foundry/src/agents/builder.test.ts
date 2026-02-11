import { describe, expect, it } from "vitest";
import { type BuilderTaskInput, buildBuilderPrompt, parseBuilderOutput } from "./builder.js";

const SAMPLE_INPUT: BuilderTaskInput = {
	taskId: "TASK-001",
	description: "Create user authentication module",
	acceptanceCriteriaIds: ["AC-001", "AC-002"],
	specContext: "The system requires JWT-based authentication.",
	constraints: ["No third-party auth libraries", "Use bcrypt for hashing"],
	existingFiles: [{ path: "src/types/user.ts", content: "export interface User { id: string; }" }],
};

describe("buildBuilderPrompt", () => {
	it("should include task ID and description", () => {
		const prompt = buildBuilderPrompt(SAMPLE_INPUT);
		expect(prompt).toContain("TASK-001");
		expect(prompt).toContain("Create user authentication module");
	});

	it("should include acceptance criteria IDs", () => {
		const prompt = buildBuilderPrompt(SAMPLE_INPUT);
		expect(prompt).toContain("AC-001, AC-002");
	});

	it("should include spec context", () => {
		const prompt = buildBuilderPrompt(SAMPLE_INPUT);
		expect(prompt).toContain("JWT-based authentication");
	});

	it("should include constraints when provided", () => {
		const prompt = buildBuilderPrompt(SAMPLE_INPUT);
		expect(prompt).toContain("No third-party auth libraries");
		expect(prompt).toContain("Use bcrypt for hashing");
	});

	it("should include existing files when provided", () => {
		const prompt = buildBuilderPrompt(SAMPLE_INPUT);
		expect(prompt).toContain("src/types/user.ts");
		expect(prompt).toContain("export interface User");
	});

	it("should omit constraints section when none provided", () => {
		const input: BuilderTaskInput = {
			...SAMPLE_INPUT,
			constraints: undefined,
		};
		const prompt = buildBuilderPrompt(input);
		expect(prompt).not.toContain("## Constraints");
	});

	it("should omit existing files section when none provided", () => {
		const input: BuilderTaskInput = {
			...SAMPLE_INPUT,
			existingFiles: undefined,
		};
		const prompt = buildBuilderPrompt(input);
		expect(prompt).not.toContain("## Existing Code");
	});
});

describe("parseBuilderOutput", () => {
	it("should parse a valid success response", () => {
		const raw = JSON.stringify({
			files: [{ path: "src/auth.ts", content: "export function login() {}", action: "create" }],
			commit_message: "feat(auth): add login function",
			pr_title: "Add authentication",
			pr_body: "## Summary\n- Added login",
			notes: "Ready for verification",
		});

		const result = parseBuilderOutput(raw);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.files).toHaveLength(1);
			expect(result.value.files[0]?.path).toBe("src/auth.ts");
			expect(result.value.commitMessage).toBe("feat(auth): add login function");
			expect(result.value.prTitle).toBe("Add authentication");
		}
	});

	it("should parse a response wrapped in markdown fences", () => {
		const raw =
			'```json\n{"files":[{"path":"a.ts","content":"x","action":"create"}],"commit_message":"m","pr_title":"t","pr_body":"b","notes":"n"}\n```';
		const result = parseBuilderOutput(raw);
		expect(result.ok).toBe(true);
	});

	it("should parse an error response", () => {
		const raw = JSON.stringify({
			error: "Task is ambiguous",
			suggestions: ["Clarify the API endpoints needed"],
		});

		const result = parseBuilderOutput(raw);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.error).toBe("Task is ambiguous");
			expect(result.error.suggestions).toContain("Clarify the API endpoints needed");
		}
	});

	it("should return error for empty files array", () => {
		const raw = JSON.stringify({ files: [], commit_message: "m" });
		const result = parseBuilderOutput(raw);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.error).toContain("at least one file");
		}
	});

	it("should default action to create for unknown values", () => {
		const raw = JSON.stringify({
			files: [{ path: "a.ts", content: "x", action: "unknown" }],
			commit_message: "m",
			pr_title: "t",
			pr_body: "b",
			notes: "n",
		});

		const result = parseBuilderOutput(raw);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.files[0]?.action).toBe("create");
		}
	});

	it("should handle modify action", () => {
		const raw = JSON.stringify({
			files: [{ path: "a.ts", content: "x", action: "modify" }],
			commit_message: "m",
			pr_title: "t",
			pr_body: "b",
			notes: "n",
		});

		const result = parseBuilderOutput(raw);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.files[0]?.action).toBe("modify");
		}
	});

	it("should handle error response with no suggestions", () => {
		const raw = JSON.stringify({ error: "Cannot proceed" });
		const result = parseBuilderOutput(raw);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.suggestions).toEqual([]);
		}
	});

	it("should throw on invalid JSON", () => {
		expect(() => parseBuilderOutput("not json")).toThrow();
	});
});
