import { describe, expect, it } from "vitest";
import { extractJson } from "./json-parser.js";

describe("extractJson", () => {
	it("should parse pure JSON", () => {
		const input = '{"tasks": [{"id": "TASK-001"}]}';
		const result = extractJson(input);
		expect(result).toEqual({ tasks: [{ id: "TASK-001" }] });
	});

	it("should parse JSON wrapped in ```json fences", () => {
		const input = '```json\n{"files": [{"path": "foo.ts"}]}\n```';
		const result = extractJson(input);
		expect(result).toEqual({ files: [{ path: "foo.ts" }] });
	});

	it("should parse JSON wrapped in ``` fences (no language tag)", () => {
		const input = '```\n{"ok": true}\n```';
		const result = extractJson(input);
		expect(result).toEqual({ ok: true });
	});

	it("should extract JSON embedded in markdown with headers", () => {
		const input = `# Plan Output

Here is the task decomposition:

\`\`\`json
{"tasks": [{"id": "TASK-001", "description": "Setup project"}], "total_estimated_cost": 1.5}
\`\`\`

This plan covers all acceptance criteria.`;
		const result = extractJson<{ tasks: Array<{ id: string }> }>(input);
		expect(result.tasks).toHaveLength(1);
		expect(result.tasks[0].id).toBe("TASK-001");
	});

	it("should extract JSON from markdown prose without fences", () => {
		const input = `# Analysis Result

The following JSON contains the analysis:

{"summary": "Test failure in auth module", "rootCause": "Missing token validation", "confidence": 0.85, "affectedFiles": ["auth.ts"]}

Please review the above.`;
		const result = extractJson<{ summary: string; confidence: number }>(input);
		expect(result.summary).toBe("Test failure in auth module");
		expect(result.confidence).toBe(0.85);
	});

	it("should handle nested braces in JSON values", () => {
		const input = `Some markdown text
{"files": [{"path": "test.ts", "content": "function foo() { return { a: 1 }; }"}]}`;
		const result = extractJson<{ files: Array<{ path: string; content: string }> }>(input);
		expect(result.files[0].path).toBe("test.ts");
		expect(result.files[0].content).toContain("{ a: 1 }");
	});

	it("should handle JSON strings with escaped quotes", () => {
		const input = '{"message": "He said \\"hello\\"", "count": 5}';
		const result = extractJson<{ message: string; count: number }>(input);
		expect(result.message).toBe('He said "hello"');
		expect(result.count).toBe(5);
	});

	it("should handle JSON arrays", () => {
		const input = 'Here is the list:\n[{"id": 1}, {"id": 2}]';
		const result = extractJson<Array<{ id: number }>>(input);
		expect(result).toHaveLength(2);
	});

	it("should throw informative error for non-JSON content", () => {
		const input = "# Just a markdown document\n\nNo JSON here at all.";
		expect(() => extractJson(input)).toThrow("Failed to extract JSON");
	});

	it("should handle whitespace around JSON", () => {
		const input = '  \n  {"result": "pass"}  \n  ';
		const result = extractJson<{ result: string }>(input);
		expect(result.result).toBe("pass");
	});

	it("should handle literal newlines inside JSON string values (LLM code output)", () => {
		// This is the exact pattern that breaks: LLM puts real newlines in "content" field
		const input =
			'{\n  "files": [\n    {\n      "path": "src/auth.ts",\n      "content": "\n// Auth Module\n\nimport { verify } from \'jsonwebtoken\';\n\nexport function checkToken(token: string) {\n  return verify(token, \'secret\');\n}\n",\n      "action": "create"\n    }\n  ],\n  "commit_message": "feat: add auth"\n}';
		const result = extractJson<{ files: Array<{ path: string; content: string }> }>(input);
		expect(result.files[0].path).toBe("src/auth.ts");
		expect(result.files[0].content).toContain("import { verify }");
		expect(result.files[0].content).toContain("checkToken");
	});

	it("should handle literal tabs inside JSON string values", () => {
		const input = '{"code": "function foo() {\n\treturn 1;\n}"}';
		const result = extractJson<{ code: string }>(input);
		expect(result.code).toContain("return 1");
	});

	it("should handle Phi-4 style markdown response with embedded JSON", () => {
		const input = `# Task Decomposition

## Overview
This specification requires implementing a user authentication system.

## Tasks

\`\`\`json
{
  "tasks": [
    {
      "id": "TASK-001",
      "description": "Implement login endpoint",
      "acceptance_criteria_ids": ["AC-001"],
      "dependencies": [],
      "agent_role": "BUILDER",
      "estimated_tokens": 5000,
      "estimated_cost": 0.05,
      "sigma_estimate": 0.3,
      "parallelizable": true
    }
  ],
  "total_estimated_cost": 0.05,
  "total_estimated_tokens": 5000
}
\`\`\`

## Notes
- The above plan covers all acceptance criteria
- Tasks are ordered by dependency`;

		const result = extractJson<{ tasks: Array<{ id: string }> }>(input);
		expect(result.tasks).toHaveLength(1);
		expect(result.tasks[0].id).toBe("TASK-001");
	});
});
