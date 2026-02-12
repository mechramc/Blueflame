import { SpecStatus } from "@blueflame/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../db.js");

import { clearAllMockStores } from "../__mocks__/db.js";
import {
	acceptSpec,
	clearAllSpecs,
	createSpecFromYaml,
	getLatestSpec,
	getSpec,
	updateSpecContent,
} from "./spec-generation.js";

const SAMPLE_YAML = `title: "Todo App"
description: "A simple todo application"
deliverables:
  - id: DEL-001
    description: "Task CRUD API"
definition_of_done: "All tests pass"
`;

afterEach(() => {
	clearAllSpecs();
	clearAllMockStores();
});

describe("Spec Generation Service", () => {
	it("should create a spec from YAML content", async () => {
		const spec = await createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		expect(spec.projectId).toBe("proj-1");
		expect(spec.status).toBe(SpecStatus.Draft);
		expect(spec.version).toBe(1);
		expect(spec.specHash).toBeNull();
		expect(spec.content).toBe(SAMPLE_YAML);
		expect(spec.title).toBe("Todo App");
		expect(spec.createdBy).toBe("user-1");
	});

	it("should extract title from YAML", async () => {
		const spec = await createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		expect(spec.title).toBe("Todo App");
	});

	it("should extract definition_of_done from YAML", async () => {
		const spec = await createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		expect(spec.definitionOfDone).toBe("All tests pass");
	});

	it("should retrieve spec by ID", async () => {
		const created = await createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		const retrieved = await getSpec(created.specId, "proj-1");
		expect(retrieved).toBeDefined();
		expect(retrieved?.specId).toBe(created.specId);
	});

	it("should get latest spec for a project", async () => {
		await createSpecFromYaml("proj-1", "title: First", "user-1");
		const second = await createSpecFromYaml("proj-1", "title: Second", "user-1");
		const latest = await getLatestSpec("proj-1");
		expect(latest?.specId).toBe(second.specId);
	});

	it("should update DRAFT spec content", async () => {
		const spec = await createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		const updated = await updateSpecContent(spec.specId, "title: Updated", "proj-1");
		expect(updated?.content).toBe("title: Updated");
	});

	it("should not update non-DRAFT spec", async () => {
		const spec = await createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		await acceptSpec(spec.specId, "proj-1");
		const updated = await updateSpecContent(spec.specId, "title: Updated", "proj-1");
		expect(updated).toBeUndefined();
	});

	it("should accept a DRAFT spec", async () => {
		const spec = await createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		const accepted = await acceptSpec(spec.specId, "proj-1");
		expect(accepted?.status).toBe(SpecStatus.Accepted);
	});

	it("should not accept an already accepted spec", async () => {
		const spec = await createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		await acceptSpec(spec.specId, "proj-1");
		const result = await acceptSpec(spec.specId, "proj-1");
		expect(result).toBeUndefined();
	});
});
