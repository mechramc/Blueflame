/**
 * PlanLock (immutable authorization artifact).
 * Source: Blueflame-Spec-v3-ACAR.md Section 10 (Stage 4), Section 13.2 (locks container)
 *
 * IMMUTABILITY: Once created, a PlanLock MUST NOT be updated or deleted.
 * The locks repository should only expose create() and read() methods.
 */

import type { Constraint } from "./constraint.js";

/** Per-agent budget and permission limits */
export interface AgentPermissions {
	/** Agent role */
	role: string;
	/** Maximum tokens this agent may consume */
	maxTokens: number;
	/** Maximum cost in USD */
	maxCost: number;
	/** Allowed tool calls / actions */
	allowedActions: string[];
}

/** The immutable authorization lock (Cosmos DB: locks container) */
export interface PlanLock {
	/** Cosmos DB document ID */
	id: string;
	/** Unique lock identifier */
	lockId: string;
	/** Partition key */
	runId: string;
	/** Project reference */
	projectId: string;
	/** SHA-256 hash of the frozen spec */
	specHash: string;
	/** Locked task IDs (subset or all from plan) */
	approvedTaskIds: string[];
	/** Total budget ceiling in USD */
	budgetCeiling: number;
	/** Per-agent limits and permissions */
	agentPermissions: AgentPermissions[];
	/** Snapshot of constraints at authorization time */
	constraintSnapshot: Constraint[];
	/** User ID who authorized */
	authorizedBy: string;
	/** ISO 8601 authorization timestamp */
	authorizedAt: string;
}
