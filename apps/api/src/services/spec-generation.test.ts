import { SpecStatus } from "@blueflame/shared";
import { afterEach, describe, expect, it } from "vitest";
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
});

describe("Spec Generation Service", () => {
	it("should create a spec from YAML content", () => {
		const spec = createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		expect(spec.projectId).toBe("proj-1");
		expect(spec.status).toBe(SpecStatus.Draft);
		expect(spec.version).toBe(1);
		expect(spec.specHash).toBeNull();
		expect(spec.content).toBe(SAMPLE_YAML);
		expect(spec.title).toBe("Todo App");
		expect(spec.createdBy).toBe("user-1");
	});

	it("should extract title from YAML", () => {
		const spec = createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		expect(spec.title).toBe("Todo App");
	});

	it("should extract definition_of_done from YAML", () => {
		const spec = createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		expect(spec.definitionOfDone).toBe("All tests pass");
	});

	it("should retrieve spec by ID", () => {
		const created = createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		const retrieved = getSpec(created.specId);
		expect(retrieved).toBeDefined();
		expect(retrieved?.specId).toBe(created.specId);
	});

	it("should get latest spec for a project", () => {
		createSpecFromYaml("proj-1", "title: First", "user-1");
		const second = createSpecFromYaml("proj-1", "title: Second", "user-1");
		const latest = getLatestSpec("proj-1");
		expect(latest?.specId).toBe(second.specId);
	});

	it("should update DRAFT spec content", () => {
		const spec = createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		const updated = updateSpecContent(spec.specId, "title: Updated");
		expect(updated?.content).toBe("title: Updated");
	});

	it("should not update non-DRAFT spec", () => {
		const spec = createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		acceptSpec(spec.specId);
		const updated = updateSpecContent(spec.specId, "title: Updated");
		expect(updated).toBeUndefined();
	});

	it("should accept a DRAFT spec", () => {
		const spec = createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		const accepted = acceptSpec(spec.specId);
		expect(accepted?.status).toBe(SpecStatus.Accepted);
	});

	it("should not accept an already accepted spec", () => {
		const spec = createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		acceptSpec(spec.specId);
		const result = acceptSpec(spec.specId);
		expect(result).toBeUndefined();
	});
});
