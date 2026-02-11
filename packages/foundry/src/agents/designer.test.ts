import { describe, expect, it } from "vitest";
import { toOpenAIMessages } from "./designer.js";
import { DESIGNER_SYSTEM_PROMPT } from "./prompts/designer-system.js";

describe("Designer Agent", () => {
	describe("DESIGNER_SYSTEM_PROMPT", () => {
		it("should contain requirement elicitation instructions", () => {
			expect(DESIGNER_SYSTEM_PROMPT).toContain("Blueflame Designer Agent");
			expect(DESIGNER_SYSTEM_PROMPT).toContain("clarifying questions");
		});

		it("should require at least 2 clarifying questions", () => {
			expect(DESIGNER_SYSTEM_PROMPT).toContain("at least 2 clarifying questions");
		});

		it("should mention progressive structuring", () => {
			expect(DESIGNER_SYSTEM_PROMPT).toContain("Deliverables");
			expect(DESIGNER_SYSTEM_PROMPT).toContain("Acceptance Criteria");
			expect(DESIGNER_SYSTEM_PROMPT).toContain("Constraints");
			expect(DESIGNER_SYSTEM_PROMPT).toContain("Non-Goals");
			expect(DESIGNER_SYSTEM_PROMPT).toContain("Risks");
		});

		it("should instruct agent to offer spec generation when ready", () => {
			expect(DESIGNER_SYSTEM_PROMPT).toContain("generate a specification");
		});
	});

	describe("toOpenAIMessages", () => {
		it("should prepend system prompt", () => {
			const messages = toOpenAIMessages([]);
			expect(messages).toHaveLength(1);
			expect(messages[0]).toEqual({
				role: "system",
				content: DESIGNER_SYSTEM_PROMPT,
			});
		});

		it("should convert user messages to user role", () => {
			const messages = toOpenAIMessages([{ role: "user", content: "Build a todo app" }]);
			expect(messages).toHaveLength(2);
			expect(messages[1]).toEqual({
				role: "user",
				content: "Build a todo app",
			});
		});

		it("should convert agent messages to assistant role", () => {
			const messages = toOpenAIMessages([{ role: "agent", content: "What kind of todo app?" }]);
			expect(messages).toHaveLength(2);
			expect(messages[1]).toEqual({
				role: "assistant",
				content: "What kind of todo app?",
			});
		});

		it("should maintain conversation order", () => {
			const messages = toOpenAIMessages([
				{ role: "user", content: "msg1" },
				{ role: "agent", content: "msg2" },
				{ role: "user", content: "msg3" },
			]);
			expect(messages).toHaveLength(4);
			expect(messages[0]?.role).toBe("system");
			expect(messages[1]?.role).toBe("user");
			expect(messages[2]?.role).toBe("assistant");
			expect(messages[3]?.role).toBe("user");
		});
	});
});
