import { describe, expect, it } from "vitest";
import { SPEC_GENERATION_SYSTEM_PROMPT } from "./prompts/spec-generation-system.js";

describe("Spec Generator", () => {
	describe("SPEC_GENERATION_SYSTEM_PROMPT", () => {
		it("should require YAML output format", () => {
			expect(SPEC_GENERATION_SYSTEM_PROMPT).toContain("YAML");
			expect(SPEC_GENERATION_SYSTEM_PROMPT).toContain("valid YAML");
		});

		it("should specify required fields", () => {
			expect(SPEC_GENERATION_SYSTEM_PROMPT).toContain("deliverables");
			expect(SPEC_GENERATION_SYSTEM_PROMPT).toContain("acceptance_criteria");
			expect(SPEC_GENERATION_SYSTEM_PROMPT).toContain("constraints");
			expect(SPEC_GENERATION_SYSTEM_PROMPT).toContain("non_goals");
			expect(SPEC_GENERATION_SYSTEM_PROMPT).toContain("risks");
			expect(SPEC_GENERATION_SYSTEM_PROMPT).toContain("definition_of_done");
		});

		it("should specify ID format (DEL-001, AC-001, RISK-001)", () => {
			expect(SPEC_GENERATION_SYSTEM_PROMPT).toContain("DEL-001");
			expect(SPEC_GENERATION_SYSTEM_PROMPT).toContain("AC-001");
			expect(SPEC_GENERATION_SYSTEM_PROMPT).toContain("RISK-001");
		});

		it("should require minimum counts", () => {
			expect(SPEC_GENERATION_SYSTEM_PROMPT).toContain("at least 3 deliverables");
			expect(SPEC_GENERATION_SYSTEM_PROMPT).toContain("5 acceptance criteria");
			expect(SPEC_GENERATION_SYSTEM_PROMPT).toContain("2 risks");
		});
	});
});
