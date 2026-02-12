/**
 * Authorization service — creates immutable PlanLock documents.
 *
 * Validates: user has Authorizer+ role, spec is frozen, plan exists,
 * budget is set. Creates PlanLock in Cosmos DB locks container and
 * transitions run status to AUTHORIZED.
 */

import type { AgentPermissions, Constraint, PlanLock, TaskPlan } from "@blueflame/shared";
import type { Result } from "@blueflame/shared";
import { AgentRole, SpecStatus, UserRole } from "@blueflame/shared";
import { db } from "../db.js";
import { hasMinimumRole } from "../middleware/rbac.js";
import { getSpec } from "./spec-generation.js";

let lockCounter = 0;

/** Default per-agent token/cost limits based on role */
const DEFAULT_AGENT_PERMISSIONS: AgentPermissions[] = [
	{
		role: AgentRole.Builder,
		maxTokens: 50000,
		maxCost: 0.5,
		allowedActions: ["code:write", "branch:create", "pr:create"],
	},
	{
		role: AgentRole.Verifier,
		maxTokens: 10000,
		maxCost: 0.1,
		allowedActions: ["test:run", "lint:check", "constraint:validate"],
	},
	{
		role: AgentRole.Explainer,
		maxTokens: 5000,
		maxCost: 0.05,
		allowedActions: ["trace:read", "diff:read", "doc:write"],
	},
];

export interface AuthorizeRequest {
	plan: TaskPlan;
	budgetCeiling: number;
	authorizedBy: string;
	userRoles: string[];
	constraints?: Constraint[];
}

/**
 * Create an immutable PlanLock for the given plan.
 *
 * Validates:
 * - User has Authorizer role or higher
 * - Spec referenced by plan is FROZEN
 * - Budget ceiling is positive
 * - Plan has tasks
 */
export async function authorizePlan(request: AuthorizeRequest): Promise<Result<PlanLock>> {
	const { plan, budgetCeiling, authorizedBy, userRoles, constraints = [] } = request;

	// Role check
	if (!hasMinimumRole(userRoles, UserRole.Authorizer)) {
		return {
			ok: false,
			error: new Error("Authorization requires Blueflame_Authorizer role or higher"),
		};
	}

	// Spec check
	const spec = await getSpec(plan.specId);
	if (!spec) {
		return { ok: false, error: new Error(`Spec not found: ${plan.specId}`) };
	}
	if (spec.status !== SpecStatus.Frozen) {
		return {
			ok: false,
			error: new Error(`Spec must be FROZEN (current: ${spec.status})`),
		};
	}

	// Budget check
	if (budgetCeiling <= 0) {
		return { ok: false, error: new Error("Budget ceiling must be positive") };
	}

	// Plan check
	if (plan.tasks.length === 0) {
		return { ok: false, error: new Error("Plan must have at least one task") };
	}

	// Hash validation
	if (spec.specHash !== plan.specHash) {
		return {
			ok: false,
			error: new Error("Plan spec hash does not match frozen spec hash"),
		};
	}

	lockCounter += 1;
	const lockId = `lock-${plan.runId}-${Date.now()}-${lockCounter}`;

	const lock: PlanLock = {
		id: lockId,
		lockId,
		runId: plan.runId,
		projectId: plan.projectId,
		specHash: plan.specHash,
		approvedTaskIds: plan.tasks.map((t) => t.id),
		budgetCeiling,
		agentPermissions: DEFAULT_AGENT_PERMISSIONS,
		constraintSnapshot: constraints,
		authorizedBy,
		authorizedAt: new Date().toISOString(),
	};

	const result = await db.locks.create(lock, plan.runId);
	if (!result.ok) {
		return { ok: false, error: new Error(`Failed to create lock: ${result.error.message}`) };
	}
	return { ok: true, value: result.value };
}

/**
 * Get a lock by ID.
 */
export async function getLock(lockId: string, runId?: string): Promise<PlanLock | undefined> {
	if (!runId) {
		// Cannot query LocksRepository without runId — it's immutable and read-only
		return undefined;
	}
	const result = await db.locks.read(lockId, runId);
	return result.ok ? result.value : undefined;
}

/**
 * Get lock for a run.
 */
export async function getLockByRunId(runId: string): Promise<PlanLock | null> {
	return db.locks.findByRun(runId);
}

/**
 * Clear all locks (for testing — no-op in production, tests mock db).
 */
export function clearAllLocks(): void {
	lockCounter = 0;
}
