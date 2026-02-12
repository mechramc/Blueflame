/**
 * Planning service — orchestrates task plan creation from frozen specs.
 *
 * Takes a frozen OutputSpec, calls the Planner agent, validates the DAG,
 * and stores the resulting TaskPlan in Cosmos DB.
 */

import type { RawPlanOutput, RawPlanTask } from "@blueflame/foundry";
import { validateDAG } from "@blueflame/foundry";
import type { PlanTask, TaskPlan } from "@blueflame/shared";
import { AgentRole, SpecStatus, TaskStatus } from "@blueflame/shared";
import type { Result } from "@blueflame/shared";
import { db } from "../db.js";
import { getSpec } from "./spec-generation.js";

let planCounter = 0;

/**
 * Map raw agent_role string to AgentRole enum.
 */
function toAgentRole(role: string): AgentRole {
	const map: Record<string, AgentRole> = {
		BUILDER: AgentRole.Builder,
		VERIFIER: AgentRole.Verifier,
		EXPLAINER: AgentRole.Explainer,
		PLANNER: AgentRole.Planner,
	};
	return map[role.toUpperCase()] ?? AgentRole.Builder;
}

/**
 * Convert raw LLM plan output into a typed TaskPlan and store it.
 */
export async function createPlanFromRaw(
	specId: string,
	runId: string,
	projectId: string,
	raw: RawPlanOutput,
): Promise<Result<TaskPlan>> {
	const spec = await getSpec(specId);
	if (!spec) {
		return { ok: false, error: new Error(`Spec not found: ${specId}`) };
	}

	if (spec.status !== SpecStatus.Frozen) {
		return {
			ok: false,
			error: new Error(`Spec must be FROZEN before planning (current: ${spec.status})`),
		};
	}

	// Validate DAG
	const dagErrors = validateDAG(raw.tasks);
	if (dagErrors.length > 0) {
		return {
			ok: false,
			error: new Error(`Invalid task DAG: ${dagErrors.join("; ")}`),
		};
	}

	planCounter += 1;
	const planId = `plan-${runId}-${Date.now()}-${planCounter}`;

	const tasks: PlanTask[] = raw.tasks.map((t: RawPlanTask) => ({
		id: t.id,
		description: t.description,
		acceptanceCriteriaIds: t.acceptance_criteria_ids,
		dependencies: t.dependencies,
		agentRole: toAgentRole(t.agent_role),
		estimatedTokens: t.estimated_tokens,
		estimatedCost: t.estimated_cost,
		sigmaEstimate: t.sigma_estimate,
		parallelizable: t.parallelizable,
		status: TaskStatus.Pending,
	}));

	const plan: TaskPlan = {
		id: planId,
		runId,
		projectId,
		specId,
		specHash: spec.specHash ?? "",
		tasks,
		totalEstimatedCost: raw.total_estimated_cost,
		totalEstimatedTokens: raw.total_estimated_tokens,
		prd: null,
		createdAt: new Date().toISOString(),
	};

	const result = await db.plans.create(plan, runId);
	if (!result.ok) {
		return { ok: false, error: new Error(`Failed to create plan: ${result.error.message}`) };
	}
	return { ok: true, value: result.value };
}

/**
 * Get a plan by ID.
 */
export async function getPlan(planId: string, runId?: string): Promise<TaskPlan | undefined> {
	if (!runId) {
		const results = await db.plans.queryAll({
			query: "SELECT * FROM c WHERE c.id = @id",
			parameters: [{ name: "@id", value: planId }],
		});
		return results[0];
	}
	const result = await db.plans.read(planId, runId);
	return result.ok ? result.value : undefined;
}

/**
 * Get the latest plan for a run.
 */
export async function getPlanByRunId(runId: string): Promise<TaskPlan | null> {
	return db.plans.findByRun(runId);
}

/**
 * Clear all plans (for testing — no-op in production, tests mock db).
 */
export function clearAllPlans(): void {
	planCounter = 0;
}
