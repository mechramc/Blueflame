/**
 * Cost Tracker — per-agent and per-run cost accounting.
 *
 * Tracks token usage and cost by model pricing tiers.
 * Provides real-time cost snapshots for the budget monitor.
 */

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

/** In-memory cost log for MVP */
const costLog: CostEntry[] = [];

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
 * Record a cost entry.
 */
export function recordCost(
	agentId: string,
	runId: string,
	model: string,
	inputTokens: number,
	outputTokens: number,
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
 * Clear all cost entries (for testing).
 */
export function clearCostLog(): void {
	costLog.length = 0;
}
