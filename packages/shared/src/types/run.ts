/**
 * Run (execution lifecycle).
 * Source: Blueflame-Spec-v3-ACAR.md Section 13.2 (runs container), Section 16.2
 *
 * State machine: PENDING → AUTHORIZED → EXECUTING → PAUSED/COMPLETED/FAILED/PARTIAL
 */

import { RunStatus } from "./enums.js";

/** A single execution run (Cosmos DB: runs container) */
export interface Run {
	/** Cosmos DB document ID */
	id: string;
	/** Unique run identifier */
	runId: string;
	/** Partition key */
	projectId: string;
	/** Current state machine status */
	status: RunStatus;
	/** Reference to the authorizing plan lock */
	lockId: string | null;
	/** Reference to the spec */
	specId: string;
	/** Actual cost incurred so far in USD */
	costActual: number;
	/** Authorized budget ceiling in USD */
	costBudget: number;
	/** ISO 8601 start timestamp */
	startedAt: string | null;
	/** ISO 8601 end timestamp (set on completion/failure) */
	endedAt: string | null;
	/** ISO 8601 creation timestamp */
	createdAt: string;
	/** User ID who initiated the run */
	createdBy: string;
}

/**
 * Valid state transitions for the Run state machine.
 * Used by RunsRepository to enforce transition rules.
 */
export const RUN_TRANSITIONS: Record<RunStatus, RunStatus[]> = {
	[RunStatus.Pending]: [RunStatus.Authorized],
	[RunStatus.Authorized]: [RunStatus.Executing],
	[RunStatus.Executing]: [RunStatus.Paused, RunStatus.Completed, RunStatus.Failed],
	[RunStatus.Paused]: [RunStatus.Executing, RunStatus.Partial, RunStatus.Failed],
	[RunStatus.Completed]: [],
	[RunStatus.Failed]: [],
	[RunStatus.Partial]: [],
};
