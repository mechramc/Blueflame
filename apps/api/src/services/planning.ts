/**
 * Planning service — orchestrates task plan creation from frozen specs.
 *
 * Takes a frozen OutputSpec, calls the Planner agent, validates the DAG,
 * and stores the resulting TaskPlan. For MVP, uses in-memory store.
 */

import type { RawPlanOutput, RawPlanTask } from "@blueflame/foundry";
import { validateDAG } from "@blueflame/foundry";
import type { PlanTask, TaskPlan } from "@blueflame/shared";
import { AgentRole, SpecStatus, TaskStatus } from "@blueflame/shared";
import type { Result } from "@blueflame/shared";
import { getSpec } from "./spec-generation.js";

/** In-memory plan store for MVP */
const plans = new Map<string, TaskPlan>();
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
export function createPlanFromRaw(
	specId: string,
	runId: string,
	projectId: string,
	raw: RawPlanOutput,
): Result<TaskPlan> {
	const spec = getSpec(specId);
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

	plans.set(planId, plan);
	return { ok: true, value: plan };
}

/**
 * Get a plan by ID.
 */
export function getPlan(planId: string): TaskPlan | undefined {
	return plans.get(planId);
}

/**
 * Get the latest plan for a run.
 */
export function getPlanByRunId(runId: string): TaskPlan | undefined {
	let latest: TaskPlan | undefined;
	for (const plan of plans.values()) {
		if (plan.runId === runId) {
			if (!latest || plan.createdAt >= latest.createdAt) {
				latest = plan;
			}
		}
	}
	return latest;
}

/**
 * Clear all plans (for testing).
 */
export function clearAllPlans(): void {
	plans.clear();
	planCounter = 0;
}
