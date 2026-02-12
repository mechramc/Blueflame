import type { RawPlanOutput } from "@blueflame/foundry";
import { UserRole } from "@blueflame/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../db.js");

import { clearAllMockStores } from "../__mocks__/db.js";
import {
	type AuthorizeRequest,
	authorizePlan,
	clearAllLocks,
	getLock,
	getLockByRunId,
} from "./authorization.js";
import { clearAllPlans, createPlanFromRaw } from "./planning.js";
import { freezeSpec } from "./spec-freeze.js";
import { acceptSpec, clearAllSpecs, createSpecFromYaml } from "./spec-generation.js";

const SAMPLE_YAML = `title: "Auth Test"
description: "Testing authorization"
definition_of_done: "All tests pass"
`;

const RAW_PLAN: RawPlanOutput = {
	tasks: [
		{
			id: "TASK-001",
			description: "Build feature",
			acceptance_criteria_ids: ["AC-001"],
			dependencies: [],
			agent_role: "BUILDER",
			estimated_tokens: 5000,
			estimated_cost: 0.05,
			sigma_estimate: 0.3,
			parallelizable: true,
		},
		{
			id: "TASK-002",
			description: "Verify feature",
			acceptance_criteria_ids: ["AC-001"],
			dependencies: ["TASK-001"],
			agent_role: "VERIFIER",
			estimated_tokens: 2000,
			estimated_cost: 0.02,
			sigma_estimate: 0.1,
			parallelizable: false,
		},
	],
	total_estimated_cost: 0.07,
	total_estimated_tokens: 7000,
};

afterEach(() => {
	clearAllSpecs();
	clearAllPlans();
	clearAllLocks();
	clearAllMockStores();
});

async function setupPlan() {
	const spec = await createSpecFromYaml("proj-1", SAMPLE_YAML, "user-1");
	await acceptSpec(spec.specId, "proj-1");
	await freezeSpec(spec.specId);
	const planResult = await createPlanFromRaw(spec.specId, "run-1", "proj-1", RAW_PLAN);
	if (!planResult.ok) throw new Error("Failed to create plan");
	return planResult.value;
}

describe("Authorization Service", () => {
	it("should create a PlanLock for valid authorization", async () => {
		const plan = await setupPlan();
		const result = await authorizePlan({
			plan,
			budgetCeiling: 1.0,
			authorizedBy: "admin-1",
			userRoles: [UserRole.Authorizer],
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.runId).toBe("run-1");
			expect(result.value.specHash).toBeTruthy();
			expect(result.value.approvedTaskIds).toEqual(["TASK-001", "TASK-002"]);
			expect(result.value.budgetCeiling).toBe(1.0);
			expect(result.value.authorizedBy).toBe("admin-1");
		}
	});

	it("should include agent permissions in lock", async () => {
		const plan = await setupPlan();
		const result = await authorizePlan({
			plan,
			budgetCeiling: 1.0,
			authorizedBy: "admin-1",
			userRoles: [UserRole.Admin],
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.agentPermissions.length).toBeGreaterThan(0);
			expect(result.value.agentPermissions[0].role).toBe("BUILDER");
		}
	});

	it("should include constraint snapshot", async () => {
		const plan = await setupPlan();
		const constraints = [
			{
				id: "c1",
				constraintId: "CONST-001",
				projectId: "proj-1",
				scope: "project" as const,
				type: "architectural" as const,
				rule: "Use TypeScript strict mode",
				enforcement: "hard" as const,
				verificationMethod: "tsc --noEmit",
				source: "user-defined" as const,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				createdBy: "user-1",
			},
		];

		const result = await authorizePlan({
			plan,
			budgetCeiling: 1.0,
			authorizedBy: "admin-1",
			userRoles: [UserRole.Authorizer],
			constraints,
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.constraintSnapshot).toHaveLength(1);
			expect(result.value.constraintSnapshot[0].rule).toBe("Use TypeScript strict mode");
		}
	});

	it("should reject authorization with insufficient role (Editor)", async () => {
		const plan = await setupPlan();
		const result = await authorizePlan({
			plan,
			budgetCeiling: 1.0,
			authorizedBy: "editor-1",
			userRoles: [UserRole.Editor],
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.message).toContain("Authorizer");
		}
	});

	it("should reject authorization with insufficient role (Viewer)", async () => {
		const plan = await setupPlan();
		const result = await authorizePlan({
			plan,
			budgetCeiling: 1.0,
			authorizedBy: "viewer-1",
			userRoles: [UserRole.Viewer],
		});

		expect(result.ok).toBe(false);
	});

	it("should reject authorization with zero budget", async () => {
		const plan = await setupPlan();
		const result = await authorizePlan({
			plan,
			budgetCeiling: 0,
			authorizedBy: "admin-1",
			userRoles: [UserRole.Admin],
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.message).toContain("positive");
		}
	});

	it("should reject authorization with negative budget", async () => {
		const plan = await setupPlan();
		const result = await authorizePlan({
			plan,
			budgetCeiling: -5,
			authorizedBy: "admin-1",
			userRoles: [UserRole.Admin],
		});

		expect(result.ok).toBe(false);
	});

	it("should retrieve lock by run ID", async () => {
		const plan = await setupPlan();
		await authorizePlan({
			plan,
			budgetCeiling: 1.0,
			authorizedBy: "admin-1",
			userRoles: [UserRole.Authorizer],
		});

		const lock = await getLockByRunId("run-1");
		expect(lock).toBeDefined();
		expect(lock?.projectId).toBe("proj-1");
	});

	it("should return null for unknown run ID", async () => {
		const lock = await getLockByRunId("unknown");
		expect(lock).toBeNull();
	});
});
