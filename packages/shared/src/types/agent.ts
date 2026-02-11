/**
 * AgentState (agent lifecycle tracking).
 * Source: Blueflame-Spec-v3-ACAR.md Section 7.1, 13.2 (agents container)
 */

import type { AgentRole, AgentStatus } from "./enums.js";

/** An agent instance within a run (Cosmos DB: agents container) */
export interface AgentState {
	/** Cosmos DB document ID */
	id: string;
	/** Unique agent identifier */
	agentId: string;
	/** Partition key */
	runId: string;
	/** Which swarm role */
	role: AgentRole;
	/** Current execution status */
	status: AgentStatus;
	/** ID of the task currently assigned */
	taskId: string | null;
	/** Which model is being used (e.g. "claude-sonnet-4.5", "gpt-4o") */
	model: string;
	/** Tokens consumed so far */
	tokensUsed: number;
	/** Self-consistency variance value [0.0, 1.0] */
	sigmaValue: number;
	/** Cost incurred in USD */
	costIncurred: number;
	/** ISO 8601 timestamp of last status change */
	lastUpdatedAt: string;
	/** ISO 8601 creation timestamp */
	createdAt: string;
}
