import { SpecStatus } from "@blueflame/shared";
import { sha256 } from "@blueflame/shared/utils/hash";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../db.js");

import { clearAllMockStores } from "../__mocks__/db.js";
import { editFrozenSpec, freezeSpec } from "./spec-freeze.js";
import { acceptSpec, clearAllSpecs, createSpecFromYaml, getSpec } from "./spec-generation.js";

const SAMPLE_YAML = `title: "Freeze Test"
description: "Testing freeze functionality"
definition_of_done: "All tests pass"
`;

afterEach(() => {
	clearAllSpecs();
	clearAllMockStores();
});

describe("Spec Freeze Service", () => {
	it("should freeze an ACCEPTED spec with SHA-256 hash", async () => {
		const spec = await createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		await acceptSpec(spec.specId, "proj-1");

		const result = await freezeSpec(spec.specId);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.status).toBe(SpecStatus.Frozen);
			expect(result.value.specHash).toBe(sha256(SAMPLE_YAML));
			expect(result.value.version).toBe(2);
		}
	});

	it("should produce deterministic hash for same content", async () => {
		const spec1 = await createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		await acceptSpec(spec1.specId, "proj-1");
		const result1 = await freezeSpec(spec1.specId);

		const spec2 = await createSpecFromYaml("proj-2", SAMPLE_YAML, "user-2");
		await acceptSpec(spec2.specId, "proj-2");
		const result2 = await freezeSpec(spec2.specId);

		expect(result1.ok && result2.ok).toBe(true);
		if (result1.ok && result2.ok) {
			expect(result1.value.specHash).toBe(result2.value.specHash);
		}
	});

	it("should reject freezing a DRAFT spec", async () => {
		const spec = await createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		const result = await freezeSpec(spec.specId);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.message).toContain("ACCEPTED");
		}
	});

	it("should reject freezing an already frozen spec", async () => {
		const spec = await createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		await acceptSpec(spec.specId, "proj-1");
		await freezeSpec(spec.specId);

		const result = await freezeSpec(spec.specId);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.message).toContain("already frozen");
		}
	});

	it("should reject freezing non-existent spec", async () => {
		const result = await freezeSpec("nonexistent");
		expect(result.ok).toBe(false);
	});

	it("should create new version when editing a frozen spec", async () => {
		const spec = await createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		await acceptSpec(spec.specId, "proj-1");
		await freezeSpec(spec.specId);

		const result = await editFrozenSpec(spec.specId, "title: Edited Version", "user-1");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.version).toBe(3); // original was 1, frozen bumped to 2, edit bumps to 3
			expect(result.value.status).toBe(SpecStatus.Draft);
			expect(result.value.content).toBe("title: Edited Version");
		}
	});

	it("should not modify original frozen spec when creating new version", async () => {
		const spec = await createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		await acceptSpec(spec.specId, "proj-1");
		await freezeSpec(spec.specId);

		await editFrozenSpec(spec.specId, "title: New", "user-1");

		const original = await getSpec(spec.specId, "proj-1");
		expect(original?.status).toBe(SpecStatus.Frozen);
		expect(original?.content).toBe(SAMPLE_YAML);
	});

	it("should reject editing non-frozen spec", async () => {
		const spec = await createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		const result = await editFrozenSpec(spec.specId, "title: New", "user-1");
		expect(result.ok).toBe(false);
	});
});
