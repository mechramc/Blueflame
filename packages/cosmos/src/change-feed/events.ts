/**
 * Change feed event types — emitted when Cosmos DB documents change.
 *
 * These events bridge Cosmos DB change feed → SignalR for real-time dashboard updates.
 * Each event type maps to a specific container and carries typed payload data.
 */

import type { AgentRole, AgentStatus, RunStatus } from "@blueflame/shared";

// ─── Event Types ─────────────────────────────────────────────

export const CHANGE_FEED_EVENTS = {
	RunStatusChanged: "RunStatusChanged",
	AgentStateChanged: "AgentStateChanged",
	CostUpdated: "CostUpdated",
} as const;

export type ChangeFeedEventType = (typeof CHANGE_FEED_EVENTS)[keyof typeof CHANGE_FEED_EVENTS];

// ─── Event Payloads ──────────────────────────────────────────

export interface RunStatusChangedEvent {
	type: typeof CHANGE_FEED_EVENTS.RunStatusChanged;
	runId: string;
	projectId: string;
	previousStatus: RunStatus | null;
	currentStatus: RunStatus;
	costActual: number;
	costBudget: number;
	timestamp: string;
}

export interface AgentStateChangedEvent {
	type: typeof CHANGE_FEED_EVENTS.AgentStateChanged;
	agentId: string;
	runId: string;
	role: AgentRole;
	previousStatus: AgentStatus | null;
	currentStatus: AgentStatus;
	taskId: string | null;
	tokensUsed: number;
	costIncurred: number;
	timestamp: string;
}

export interface CostUpdatedEvent {
	type: typeof CHANGE_FEED_EVENTS.CostUpdated;
	runId: string;
	costActual: number;
	costBudget: number;
	percentUsed: number;
	timestamp: string;
}

/** Union of all change feed events */
export type ChangeFeedEvent = RunStatusChangedEvent | AgentStateChangedEvent | CostUpdatedEvent;

// ─── Event Listener ──────────────────────────────────────────

export type ChangeFeedListener = (event: ChangeFeedEvent) => void;
