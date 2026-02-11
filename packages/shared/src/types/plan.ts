/**
 * TaskPlan and Task types.
 * Source: Blueflame-Spec-v3-ACAR.md Section 7.1, 7.4, 13.2 (plans container)
 */

import type { AgentRole, TaskStatus } from "./enums.js";

/** A single task within a plan */
export interface PlanTask {
	/** Unique task ID, e.g. "TASK-001" */
	id: string;
	/** Human-readable description */
	description: string;
	/** IDs of acceptance criteria this task satisfies */
	acceptanceCriteriaIds: string[];
	/** IDs of tasks this depends on (DAG edges) */
	dependencies: string[];
	/** Which agent role should execute this */
	agentRole: AgentRole;
	/** Estimated token usage */
	estimatedTokens: number;
	/** Estimated cost in USD */
	estimatedCost: number;
	/** Self-consistency variance for routing */
	sigmaEstimate: number;
	/** Whether this task can run in parallel with siblings */
	parallelizable: boolean;
	/** Current execution status */
	status: TaskStatus;
}

/** The full task plan artifact (Cosmos DB: plans container) */
export interface TaskPlan {
	/** Cosmos DB document ID */
	id: string;
	/** Partition key */
	runId: string;
	/** Project reference */
	projectId: string;
	/** Reference to the frozen spec this was derived from */
	specId: string;
	/** SHA-256 hash of the source spec */
	specHash: string;
	/** Ordered list of tasks forming a DAG */
	tasks: PlanTask[];
	/** Total estimated cost in USD */
	totalEstimatedCost: number;
	/** Total estimated tokens */
	totalEstimatedTokens: number;
	/** Optional PRD markdown (derived artifact) */
	prd: string | null;
	/** ISO 8601 creation timestamp */
	createdAt: string;
}
