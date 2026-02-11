/**
 * Agent Spawner — creates and tracks agent instances for task execution.
 *
 * Manages agent lifecycle: spawn → execute → complete/fail.
 * Emits state changes for SignalR broadcast.
 */

import type { AgentState } from "@blueflame/shared";
import { type AgentRole, AgentStatus } from "@blueflame/shared";

/** In-memory agent store for MVP */
const agents = new Map<string, AgentState>();
let agentCounter = 0;

/** Callback for agent state changes (wired to SignalR) */
export type AgentStateCallback = (state: AgentState) => void;

let stateCallback: AgentStateCallback | null = null;

/**
 * Register a callback for agent state changes.
 */
export function onAgentStateChange(callback: AgentStateCallback): void {
	stateCallback = callback;
}

/**
 * Spawn a new agent instance for a task.
 */
export function spawnAgent(
	runId: string,
	role: AgentRole,
	taskId: string,
	model: string,
): AgentState {
	agentCounter += 1;
	const agentId = `agent-${runId}-${role.toLowerCase()}-${agentCounter}`;
	const now = new Date().toISOString();

	const state: AgentState = {
		id: agentId,
		agentId,
		runId,
		role,
		status: AgentStatus.Idle,
		taskId,
		model,
		tokensUsed: 0,
		sigmaValue: 0,
		costIncurred: 0,
		lastUpdatedAt: now,
		createdAt: now,
	};

	agents.set(agentId, state);
	notifyStateChange(state);
	return state;
}

/**
 * Update an agent's status.
 */
export function updateAgentStatus(agentId: string, status: AgentStatus): AgentState | undefined {
	const agent = agents.get(agentId);
	if (!agent) return undefined;

	agent.status = status;
	agent.lastUpdatedAt = new Date().toISOString();
	notifyStateChange(agent);
	return agent;
}

/**
 * Record token usage and cost for an agent.
 */
export function recordAgentUsage(
	agentId: string,
	tokensUsed: number,
	costIncurred: number,
	sigmaValue?: number,
): AgentState | undefined {
	const agent = agents.get(agentId);
	if (!agent) return undefined;

	agent.tokensUsed += tokensUsed;
	agent.costIncurred += costIncurred;
	if (sigmaValue !== undefined) {
		agent.sigmaValue = sigmaValue;
	}
	agent.lastUpdatedAt = new Date().toISOString();
	notifyStateChange(agent);
	return agent;
}

/**
 * Get all agents for a run.
 */
export function getAgentsByRunId(runId: string): AgentState[] {
	return [...agents.values()].filter((a) => a.runId === runId);
}

/**
 * Get a specific agent by ID.
 */
export function getAgent(agentId: string): AgentState | undefined {
	return agents.get(agentId);
}

/**
 * Get total cost for a run across all agents.
 */
export function getRunTotalCost(runId: string): number {
	return getAgentsByRunId(runId).reduce((sum, a) => sum + a.costIncurred, 0);
}

/**
 * Clear all agents (for testing).
 */
export function clearAllAgents(): void {
	agents.clear();
	agentCounter = 0;
	stateCallback = null;
}

function notifyStateChange(state: AgentState): void {
	if (stateCallback) {
		stateCallback(state);
	}
}
