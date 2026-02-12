/**
 * Agent Spawner — creates and tracks agent instances for task execution.
 *
 * Manages agent lifecycle: spawn → execute → complete/fail.
 * Hybrid: in-memory for hot state + Cosmos DB for persistence/audit.
 * Emits state changes for SignalR broadcast.
 */

import type { AgentState } from "@blueflame/shared";
import { type AgentRole, AgentStatus } from "@blueflame/shared";
import { db } from "../db.js";

/** In-memory agent cache for hot state during execution */
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
export async function spawnAgent(
	runId: string,
	role: AgentRole,
	taskId: string,
	model: string,
): Promise<AgentState> {
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

	// Persist to Cosmos (fire and forget — don't block execution)
	db.agents.create(state, runId).catch((err) => {
		console.warn(`[AgentSpawner] Failed to persist agent ${agentId}:`, err);
	});

	notifyStateChange(state);
	return state;
}

/**
 * Update an agent's status.
 */
export async function updateAgentStatus(
	agentId: string,
	status: AgentStatus,
): Promise<AgentState | undefined> {
	const agent = agents.get(agentId);
	if (!agent) return undefined;

	agent.status = status;
	agent.lastUpdatedAt = new Date().toISOString();

	// Persist to Cosmos
	db.agents.update(agent, agent.runId).catch((err) => {
		console.warn(`[AgentSpawner] Failed to persist agent status ${agentId}:`, err);
	});

	notifyStateChange(agent);
	return agent;
}

/**
 * Record token usage and cost for an agent.
 */
export async function recordAgentUsage(
	agentId: string,
	tokensUsed: number,
	costIncurred: number,
	sigmaValue?: number,
): Promise<AgentState | undefined> {
	const agent = agents.get(agentId);
	if (!agent) return undefined;

	agent.tokensUsed += tokensUsed;
	agent.costIncurred += costIncurred;
	if (sigmaValue !== undefined) {
		agent.sigmaValue = sigmaValue;
	}
	agent.lastUpdatedAt = new Date().toISOString();

	// Persist to Cosmos
	db.agents.update(agent, agent.runId).catch((err) => {
		console.warn(`[AgentSpawner] Failed to persist agent usage ${agentId}:`, err);
	});

	notifyStateChange(agent);
	return agent;
}

/**
 * Get all agents for a run (from in-memory cache).
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
