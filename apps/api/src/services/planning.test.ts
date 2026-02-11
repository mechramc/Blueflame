import type { RawPlanOutput } from "@blueflame/foundry";
import { TaskStatus } from "@blueflame/shared";
import { afterEach, describe, expect, it } from "vitest";
import { clearAllPlans, createPlanFromRaw, getPlan, getPlanByRunId } from "./planning.js";
import { freezeSpec } from "./spec-freeze.js";
import { acceptSpec, clearAllSpecs, createSpecFromYaml } from "./spec-generation.js";

const SAMPLE_YAML = `title: "Plan Test"
description: "Testing planning functionality"
definition_of_done: "All tasks complete"
`;

const VALID_RAW_PLAN: RawPlanOutput = {
	tasks: [
		{
			id: "TASK-001",
			description: "Set up project structure",
			acceptance_criteria_ids: ["AC-001"],
			dependencies: [],
			agent_role: "BUILDER",
			estimated_tokens: 5000,
			estimated_cost: 0.05,
			sigma_estimate: 0.2,
			parallelizable: true,
		},
		{
			id: "TASK-002",
			description: "Implement core logic",
			acceptance_criteria_ids: ["AC-002"],
			dependencies: ["TASK-001"],
			agent_role: "BUILDER",
			estimated_tokens: 15000,
			estimated_cost: 0.15,
			sigma_estimate: 0.5,
			parallelizable: false,
		},
		{
			id: "TASK-003",
			description: "Run integration tests",
			acceptance_criteria_ids: ["AC-001", "AC-002"],
			dependencies: ["TASK-002"],
			agent_role: "VERIFIER",
			estimated_tokens: 3000,
			estimated_cost: 0.03,
			sigma_estimate: 0.1,
			parallelizable: false,
		},
	],
	total_estimated_cost: 0.23,
	total_estimated_tokens: 23000,
};

afterEach(() => {
	clearAllSpecs();
	clearAllPlans();
});

function createFrozenSpec(): string {
	const spec = createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
	acceptSpec(spec.specId);
	freezeSpec(spec.specId);
	return spec.specId;
}

describe("Planning Service", () => {
	it("should create a plan from raw LLM output for a frozen spec", () => {
		const specId = createFrozenSpec();
		const result = createPlanFromRaw(specId, "run-1", "proj-1", VALID_RAW_PLAN);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.tasks).toHaveLength(3);
			expect(result.value.runId).toBe("run-1");
			expect(result.value.projectId).toBe("proj-1");
			expect(result.value.specId).toBe(specId);
			expect(result.value.totalEstimatedCost).toBe(0.23);
		}
	});

	it("should set all tasks to PENDING status", () => {
		const specId = createFrozenSpec();
		const result = createPlanFromRaw(specId, "run-1", "proj-1", VALID_RAW_PLAN);

		expect(result.ok).toBe(true);
		if (result.ok) {
			for (const task of result.value.tasks) {
				expect(task.status).toBe(TaskStatus.Pending);
			}
		}
	});

	it("should map agent roles correctly", () => {
		const specId = createFrozenSpec();
		const result = createPlanFromRaw(specId, "run-1", "proj-1", VALID_RAW_PLAN);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.tasks[0].agentRole).toBe("BUILDER");
			expect(result.value.tasks[2].agentRole).toBe("VERIFIER");
		}
	});

	it("should include spec hash from frozen spec", () => {
		const specId = createFrozenSpec();
		const result = createPlanFromRaw(specId, "run-1", "proj-1", VALID_RAW_PLAN);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.specHash).toBeTruthy();
			expect(result.value.specHash.length).toBe(64); // SHA-256 hex
		}
	});

	it("should reject planning for a non-frozen spec", () => {
		const spec = createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
		const result = createPlanFromRaw(spec.specId, "run-1", "proj-1", VALID_RAW_PLAN);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.message).toContain("FROZEN");
		}
	});

	it("should reject planning for non-existent spec", () => {
		const result = createPlanFromRaw("nonexistent", "run-1", "proj-1", VALID_RAW_PLAN);
		expect(result.ok).toBe(false);
	});

	it("should reject plan with cyclic dependencies", () => {
		const specId = createFrozenSpec();
		const cyclicPlan: RawPlanOutput = {
			tasks: [
				{
					id: "TASK-001",
					description: "A",
					acceptance_criteria_ids: [],
					dependencies: ["TASK-002"],
					agent_role: "BUILDER",
					estimated_tokens: 1000,
					estimated_cost: 0.01,
					sigma_estimate: 0.1,
					parallelizable: false,
				},
				{
					id: "TASK-002",
					description: "B",
					acceptance_criteria_ids: [],
					dependencies: ["TASK-001"],
					agent_role: "BUILDER",
					estimated_tokens: 1000,
					estimated_cost: 0.01,
					sigma_estimate: 0.1,
					parallelizable: false,
				},
			],
			total_estimated_cost: 0.02,
			total_estimated_tokens: 2000,
		};

		const result = createPlanFromRaw(specId, "run-1", "proj-1", cyclicPlan);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.message).toContain("cycle");
		}
	});

	it("should retrieve plan by ID", () => {
		const specId = createFrozenSpec();
		const result = createPlanFromRaw(specId, "run-1", "proj-1", VALID_RAW_PLAN);

		expect(result.ok).toBe(true);
		if (result.ok) {
			const retrieved = getPlan(result.value.id);
			expect(retrieved).toBeDefined();
			expect(retrieved?.runId).toBe("run-1");
		}
	});

	it("should retrieve plan by run ID", () => {
		const specId = createFrozenSpec();
		createPlanFromRaw(specId, "run-1", "proj-1", VALID_RAW_PLAN);

		const plan = getPlanByRunId("run-1");
		expect(plan).toBeDefined();
		expect(plan?.runId).toBe("run-1");
	});

	it("should return undefined for unknown run ID", () => {
		expect(getPlanByRunId("unknown")).toBeUndefined();
	});
});
