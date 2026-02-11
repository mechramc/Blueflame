import { SpecStatus } from "@blueflame/shared";
import { sha256 } from "@blueflame/shared/utils/hash";
import { afterEach, describe, expect, it } from "vitest";
import { editFrozenSpec, freezeSpec } from "./spec-freeze.js";
import { acceptSpec, clearAllSpecs, createSpecFromYaml, getSpec } from "./spec-generation.js";

const SAMPLE_YAML = `title: "Freeze Test"
description: "Testing freeze functionality"
definition_of_done: "All tests pass"
`;

afterEach(() => {
	clearAllSpecs();
});

describe("Spec Freeze Service", () => {
	it("should freeze an ACCEPTED spec with SHA-256 hash", () => {
		const spec = createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		acceptSpec(spec.specId);

		const result = freezeSpec(spec.specId);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.status).toBe(SpecStatus.Frozen);
			expect(result.value.specHash).toBe(sha256(SAMPLE_YAML));
			expect(result.value.version).toBe(2);
		}
	});

	it("should produce deterministic hash for same content", () => {
		const spec1 = createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		acceptSpec(spec1.specId);
		const result1 = freezeSpec(spec1.specId);

		const spec2 = createSpecFromYaml("proj-2", SAMPLE_YAML, "user-2");
		acceptSpec(spec2.specId);
		const result2 = freezeSpec(spec2.specId);

		expect(result1.ok && result2.ok).toBe(true);
		if (result1.ok && result2.ok) {
			expect(result1.value.specHash).toBe(result2.value.specHash);
		}
	});

	it("should reject freezing a DRAFT spec", () => {
		const spec = createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		const result = freezeSpec(spec.specId);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.message).toContain("ACCEPTED");
		}
	});

	it("should reject freezing an already frozen spec", () => {
		const spec = createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		acceptSpec(spec.specId);
		freezeSpec(spec.specId);

		const result = freezeSpec(spec.specId);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.message).toContain("already frozen");
		}
	});

	it("should reject freezing non-existent spec", () => {
		const result = freezeSpec("nonexistent");
		expect(result.ok).toBe(false);
	});

	it("should create new version when editing a frozen spec", () => {
		const spec = createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		acceptSpec(spec.specId);
		freezeSpec(spec.specId);

		const result = editFrozenSpec(spec.specId, "title: Edited Version", "user-1");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.version).toBe(3); // original was 1, frozen bumped to 2, edit bumps to 3
			expect(result.value.status).toBe(SpecStatus.Draft);
			expect(result.value.content).toBe("title: Edited Version");
		}
	});

	it("should not modify original frozen spec when creating new version", () => {
		const spec = createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		acceptSpec(spec.specId);
		freezeSpec(spec.specId);

		editFrozenSpec(spec.specId, "title: New", "user-1");

		const original = getSpec(spec.specId);
		expect(original?.status).toBe(SpecStatus.Frozen);
		expect(original?.content).toBe(SAMPLE_YAML);
	});

	it("should reject editing non-frozen spec", () => {
		const spec = createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		const result = editFrozenSpec(spec.specId, "title: New", "user-1");
		expect(result.ok).toBe(false);
	});
});
