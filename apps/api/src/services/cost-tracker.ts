/**
 * Cost Tracker — per-agent and per-run cost accounting.
 *
 * Uses in-memory cache with Cosmos DB write-through.
 * Cost entries persisted to "documents" container with type "cost-entry".
 * On startup, loads existing entries from Cosmos.
 */

import { db } from "../db.js";

/** Model pricing per 1K tokens (input/output) */
export interface ModelPricing {
	inputPer1K: number;
	outputPer1K: number;
}

/** Known model pricing tiers */
const MODEL_PRICING: Record<string, ModelPricing> = {
	// Azure OpenAI / OpenAI Direct
	"gpt-4o": { inputPer1K: 0.005, outputPer1K: 0.015 },
	"gpt-4o-mini": { inputPer1K: 0.00015, outputPer1K: 0.0006 },
	o1: { inputPer1K: 0.015, outputPer1K: 0.06 },
	// Anthropic
	"claude-opus-4-6": { inputPer1K: 0.015, outputPer1K: 0.075 },
	"claude-sonnet-4-5": { inputPer1K: 0.003, outputPer1K: 0.015 },
	"claude-haiku-4-5": { inputPer1K: 0.0008, outputPer1K: 0.004 },
	// Google
	"gemini-2.5-pro": { inputPer1K: 0.00125, outputPer1K: 0.01 },
	"gemini-2.5-flash": { inputPer1K: 0.000075, outputPer1K: 0.0003 },
};

/** Cost entry for a single agent invocation */
export interface CostEntry {
	agentId: string;
	runId: string;
	model: string;
	inputTokens: number;
	outputTokens: number;
	cost: number;
	timestamp: string;
}

/** In-memory cost log — hot cache backed by Cosmos */
const costLog: CostEntry[] = [];

/** Track whether we've loaded from Cosmos */
let cosmosLoaded = false;

/**
 * Persist a cost entry to Cosmos (fire-and-forget).
 */
function persistCostEntry(entry: CostEntry, projectId: string): void {
	const doc = {
		id: `cost-${entry.runId}-${entry.agentId}-${entry.timestamp}`,
		projectId,
		type: "cost-entry",
		...entry,
	};
	db.documents
		.upsert(doc as never, projectId)
		.catch((err) => console.error("[cost-tracker] Cosmos persist failed:", err));
}

/**
 * Load cost entries from Cosmos for a project. Idempotent.
 */
export async function loadCostEntriesFromCosmos(projectId: string): Promise<void> {
	if (cosmosLoaded) return;
	try {
		const docs = await db.documents.findByType(projectId, "cost-entry");
		for (const doc of docs) {
			const entry = doc as unknown as CostEntry & { id: string };
			// Deduplicate — check if already in memory by timestamp + agentId
			const exists = costLog.some(
				(e) => e.timestamp === entry.timestamp && e.agentId === entry.agentId,
			);
			if (!exists) {
				costLog.push({
					agentId: entry.agentId,
					runId: entry.runId,
					model: entry.model,
					inputTokens: entry.inputTokens,
					outputTokens: entry.outputTokens,
					cost: entry.cost,
					timestamp: entry.timestamp,
				});
			}
		}
		cosmosLoaded = true;
	} catch {
		// Cosmos unavailable — continue with in-memory only
	}
}

/**
 * Estimate cost for a token usage event.
 */
export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
	const pricing = MODEL_PRICING[model];
	if (!pricing) {
		// Fallback: use gpt-4o pricing for unknown models
		const fallback = MODEL_PRICING["gpt-4o"];
		if (!fallback) return 0;
		return (
			(inputTokens / 1000) * fallback.inputPer1K + (outputTokens / 1000) * fallback.outputPer1K
		);
	}
	return (inputTokens / 1000) * pricing.inputPer1K + (outputTokens / 1000) * pricing.outputPer1K;
}

/**
 * Record a cost entry. Persists to Cosmos.
 */
export function recordCost(
	agentId: string,
	runId: string,
	model: string,
	inputTokens: number,
	outputTokens: number,
	projectId?: string,
): CostEntry {
	const cost = estimateCost(model, inputTokens, outputTokens);
	const entry: CostEntry = {
		agentId,
		runId,
		model,
		inputTokens,
		outputTokens,
		cost,
		timestamp: new Date().toISOString(),
	};
	costLog.push(entry);

	// Persist to Cosmos if we have a projectId
	if (projectId) {
		persistCostEntry(entry, projectId);
	}

	return entry;
}

/**
 * Get total cost for a run.
 */
export function getRunCost(runId: string): number {
	return costLog.filter((e) => e.runId === runId).reduce((sum, e) => sum + e.cost, 0);
}

/**
 * Get cost breakdown by agent for a run.
 */
export function getRunCostByAgent(runId: string): Map<string, number> {
	const byAgent = new Map<string, number>();
	for (const entry of costLog) {
		if (entry.runId !== runId) continue;
		byAgent.set(entry.agentId, (byAgent.get(entry.agentId) ?? 0) + entry.cost);
	}
	return byAgent;
}

/**
 * Get all cost entries for a run.
 */
export function getRunCostEntries(runId: string): CostEntry[] {
	return costLog.filter((e) => e.runId === runId);
}

/**
 * Get total token usage for a run.
 */
export function getRunTokenUsage(runId: string): { input: number; output: number } {
	let input = 0;
	let output = 0;
	for (const entry of costLog) {
		if (entry.runId !== runId) continue;
		input += entry.inputTokens;
		output += entry.outputTokens;
	}
	return { input, output };
}

/**
 * Get aggregated costs grouped by project (for chargeback dashboard).
 */
export function getAggregatedCosts(): import("@blueflame/shared").ChargebackEntry[] {
	// Group costs by runId (we'll use runId as project proxy for now)
	const byRun = new Map<string, CostEntry[]>();
	for (const entry of costLog) {
		const entries = byRun.get(entry.runId) ?? [];
		entries.push(entry);
		byRun.set(entry.runId, entries);
	}

	const results: import("@blueflame/shared").ChargebackEntry[] = [];

	for (const [runId, entries] of byRun) {
		const totalSpend = entries.reduce((sum, e) => sum + e.cost, 0);
		const taskCount = entries.length;

		// Aggregate by model
		const modelCosts = new Map<string, number>();
		for (const e of entries) {
			modelCosts.set(e.model, (modelCosts.get(e.model) ?? 0) + e.cost);
		}
		const topModels = [...modelCosts.entries()]
			.map(([model, cost]) => ({ model, cost }))
			.sort((a, b) => b.cost - a.cost);

		// Aggregate by agent role (extracted from agentId naming convention)
		const roleCosts = new Map<string, number>();
		for (const e of entries) {
			const rolePart = e.agentId.replace(/^agent-[^-]+-/, "").replace(/-\d+$/, "");
			const role = rolePart.charAt(0).toUpperCase() + rolePart.slice(1);
			roleCosts.set(role, (roleCosts.get(role) ?? 0) + e.cost);
		}
		const topRoles = [...roleCosts.entries()]
			.map(([role, cost]) => ({ role, cost }))
			.sort((a, b) => b.cost - a.cost);

		results.push({
			poolId: `pool-${runId}`,
			poolName: `Run ${runId}`,
			tier: "PROJECT",
			totalSpend,
			taskCount,
			topModels,
			topRoles,
		});
	}

	return results;
}

/**
 * Get summary totals across all cost entries.
 */
export function getCostTotals(): { spend: number; tasks: number } {
	return {
		spend: costLog.reduce((sum, e) => sum + e.cost, 0),
		tasks: costLog.length,
	};
}

/**
 * Clear all cost entries (for testing).
 */
export function clearCostLog(): void {
	costLog.length = 0;
	cosmosLoaded = false;
}
