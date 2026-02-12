/**
 * Model Cost Tracker — per-tier cost tracking and benchmarking.
 *
 * Tracks cost by execution tier (Routine/Standard/Complex) and model.
 * Compares σ-routed runs vs fixed-model baseline for cost savings.
 */

import type { ExecutionTier } from "@blueflame/foundry";

/** Cost entry with tier information */
export interface TieredCostEntry {
	runId: string;
	taskId: string;
	agentRole: string;
	tier: ExecutionTier;
	model: string;
	inputTokens: number;
	outputTokens: number;
	cost: number;
	timestamp: string;
}

/** Cost breakdown by tier */
export interface TierCostBreakdown {
	tier: ExecutionTier;
	totalCost: number;
	totalInputTokens: number;
	totalOutputTokens: number;
	taskCount: number;
	models: Map<string, number>;
}

/** Benchmark comparison: σ-routed vs fixed model */
export interface BenchmarkResult {
	runId: string;
	sigmaRoutedCost: number;
	fixedModelCost: number;
	savingsPercent: number;
	tierBreakdown: TierCostBreakdown[];
	fixedModel: string;
}

/** In-memory tiered cost log for MVP */
const tieredCostLog: TieredCostEntry[] = [];

/**
 * Record a tiered cost entry.
 */
export function recordTieredCost(entry: Omit<TieredCostEntry, "timestamp">): TieredCostEntry {
	const full: TieredCostEntry = {
		...entry,
		timestamp: new Date().toISOString(),
	};
	tieredCostLog.push(full);
	return full;
}

/**
 * Get cost breakdown by tier for a run.
 */
export function getTierBreakdown(runId: string): TierCostBreakdown[] {
	const entries = tieredCostLog.filter((e) => e.runId === runId);
	const tierMap = new Map<string, TierCostBreakdown>();

	for (const entry of entries) {
		let breakdown = tierMap.get(entry.tier);
		if (!breakdown) {
			breakdown = {
				tier: entry.tier,
				totalCost: 0,
				totalInputTokens: 0,
				totalOutputTokens: 0,
				taskCount: 0,
				models: new Map(),
			};
			tierMap.set(entry.tier, breakdown);
		}

		breakdown.totalCost += entry.cost;
		breakdown.totalInputTokens += entry.inputTokens;
		breakdown.totalOutputTokens += entry.outputTokens;
		breakdown.taskCount++;
		breakdown.models.set(entry.model, (breakdown.models.get(entry.model) ?? 0) + entry.cost);
	}

	return [...tierMap.values()];
}

/**
 * Get all tiered cost entries for a run.
 */
export function getTieredCostEntries(runId: string): TieredCostEntry[] {
	return tieredCostLog.filter((e) => e.runId === runId);
}

/**
 * Get all routing decisions (history) across all runs.
 */
export function getAllTieredEntries(): TieredCostEntry[] {
	return [...tieredCostLog];
}

/**
 * Compute benchmark: compare σ-routed cost vs hypothetical fixed-model cost.
 *
 * @param runId - Run to benchmark
 * @param fixedModel - Baseline model to compare against (default: "gpt-4o")
 * @param fixedModelInputPer1K - Fixed model input price per 1K tokens
 * @param fixedModelOutputPer1K - Fixed model output price per 1K tokens
 */
export function computeBenchmark(
	runId: string,
	fixedModel = "gpt-4o",
	fixedModelInputPer1K = 0.005,
	fixedModelOutputPer1K = 0.015,
): BenchmarkResult {
	const entries = tieredCostLog.filter((e) => e.runId === runId);

	const sigmaRoutedCost = entries.reduce((sum, e) => sum + e.cost, 0);

	// Compute what it would cost if ALL tasks used the fixed model
	const fixedModelCost = entries.reduce((sum, e) => {
		return (
			sum +
			(e.inputTokens / 1000) * fixedModelInputPer1K +
			(e.outputTokens / 1000) * fixedModelOutputPer1K
		);
	}, 0);

	const savingsPercent =
		fixedModelCost > 0 ? ((fixedModelCost - sigmaRoutedCost) / fixedModelCost) * 100 : 0;

	return {
		runId,
		sigmaRoutedCost,
		fixedModelCost,
		savingsPercent,
		tierBreakdown: getTierBreakdown(runId),
		fixedModel,
	};
}

/**
 * Clear all tiered cost entries (for testing).
 */
export function clearTieredCostLog(): void {
	tieredCostLog.length = 0;
}
