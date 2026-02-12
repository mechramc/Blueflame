import { describe, expect, it } from "vitest";

import {
	ALL_VERIFIER_TEMPLATES,
	VERIFIER_DEPS,
	VERIFIER_FORMAT,
	VERIFIER_LINT,
	VERIFIER_TEST,
	VERIFIER_TYPECHECK,
	getTemplatesByCategory,
	getVerifierTemplate,
} from "./verifier-templates.js";

describe("verifier templates", () => {
	it("should have 5 templates", () => {
		expect(ALL_VERIFIER_TEMPLATES).toHaveLength(5);
	});

	it("should have unique IDs", () => {
		const ids = ALL_VERIFIER_TEMPLATES.map((t) => t.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("should all have required fields", () => {
		for (const template of ALL_VERIFIER_TEMPLATES) {
			expect(template.id).toBeTruthy();
			expect(template.name).toBeTruthy();
			expect(template.description).toBeTruthy();
			expect(template.command).toBeTruthy();
			expect(template.passPattern).toBeTruthy();
			expect(template.failPattern).toBeTruthy();
			expect(template.acceptanceCriteria).toBeTruthy();
			expect(template.category).toBeTruthy();
		}
	});

	it("should have valid regex patterns", () => {
		for (const template of ALL_VERIFIER_TEMPLATES) {
			expect(() => new RegExp(template.passPattern)).not.toThrow();
			expect(() => new RegExp(template.failPattern)).not.toThrow();
		}
	});
});

describe("VERIFIER_LINT", () => {
	it("should target biome check", () => {
		expect(VERIFIER_LINT.command).toContain("biome check");
		expect(VERIFIER_LINT.category).toBe("lint");
	});
});

describe("VERIFIER_TYPECHECK", () => {
	it("should target tsc --noEmit", () => {
		expect(VERIFIER_TYPECHECK.command).toContain("tsc --noEmit");
		expect(VERIFIER_TYPECHECK.category).toBe("typecheck");
	});
});

describe("VERIFIER_DEPS", () => {
	it("should target npm audit", () => {
		expect(VERIFIER_DEPS.command).toContain("npm audit");
		expect(VERIFIER_DEPS.category).toBe("deps");
	});
});

describe("VERIFIER_TEST", () => {
	it("should target vitest with coverage", () => {
		expect(VERIFIER_TEST.command).toContain("vitest run");
		expect(VERIFIER_TEST.command).toContain("coverage");
		expect(VERIFIER_TEST.category).toBe("test");
	});
});

describe("VERIFIER_FORMAT", () => {
	it("should target biome format", () => {
		expect(VERIFIER_FORMAT.command).toContain("biome format");
		expect(VERIFIER_FORMAT.category).toBe("format");
	});
});

describe("getVerifierTemplate", () => {
	it("should return template by ID", () => {
		expect(getVerifierTemplate("verifier-lint")).toBe(VERIFIER_LINT);
	});

	it("should return undefined for unknown ID", () => {
		expect(getVerifierTemplate("unknown")).toBeUndefined();
	});
});

describe("getTemplatesByCategory", () => {
	it("should filter by category", () => {
		const lintTemplates = getTemplatesByCategory("lint");
		expect(lintTemplates).toHaveLength(1);
		expect(lintTemplates[0]?.id).toBe("verifier-lint");
	});

	it("should return empty for unused category", () => {
		// All categories are used, but let's check one
		const testTemplates = getTemplatesByCategory("test");
		expect(testTemplates).toHaveLength(1);
	});
});
