import { ExecutionTier } from "@blueflame/foundry";
import { afterEach, describe, expect, it } from "vitest";

import {
	clearTieredCostLog,
	computeBenchmark,
	getTierBreakdown,
	getTieredCostEntries,
	recordTieredCost,
} from "./model-cost-tracker.js";

afterEach(() => {
	clearTieredCostLog();
});

describe("recordTieredCost", () => {
	it("should record a cost entry with timestamp", () => {
		const entry = recordTieredCost({
			runId: "run-1",
			taskId: "TASK-001",
			agentRole: "BUILDER",
			tier: ExecutionTier.Routine,
			model: "gpt-4o-mini",
			inputTokens: 500,
			outputTokens: 200,
			cost: 0.001,
		});

		expect(entry.timestamp).toBeTruthy();
		expect(entry.runId).toBe("run-1");
		expect(entry.tier).toBe(ExecutionTier.Routine);
	});
});

describe("getTierBreakdown", () => {
	it("should group costs by tier", () => {
		recordTieredCost({
			runId: "run-1",
			taskId: "TASK-001",
			agentRole: "BUILDER",
			tier: ExecutionTier.Routine,
			model: "gpt-4o-mini",
			inputTokens: 500,
			outputTokens: 200,
			cost: 0.001,
		});
		recordTieredCost({
			runId: "run-1",
			taskId: "TASK-002",
			agentRole: "BUILDER",
			tier: ExecutionTier.Complex,
			model: "claude-sonnet-4-5",
			inputTokens: 1000,
			outputTokens: 500,
			cost: 0.01,
		});

		const breakdown = getTierBreakdown("run-1");
		expect(breakdown).toHaveLength(2);

		const routine = breakdown.find((b) => b.tier === ExecutionTier.Routine);
		expect(routine?.totalCost).toBe(0.001);
		expect(routine?.taskCount).toBe(1);

		const complex = breakdown.find((b) => b.tier === ExecutionTier.Complex);
		expect(complex?.totalCost).toBe(0.01);
	});

	it("should return empty array for unknown run", () => {
		expect(getTierBreakdown("unknown")).toHaveLength(0);
	});

	it("should track models per tier", () => {
		recordTieredCost({
			runId: "run-1",
			taskId: "TASK-001",
			agentRole: "BUILDER",
			tier: ExecutionTier.Standard,
			model: "gpt-4o",
			inputTokens: 500,
			outputTokens: 200,
			cost: 0.005,
		});

		const breakdown = getTierBreakdown("run-1");
		const standard = breakdown.find((b) => b.tier === ExecutionTier.Standard);
		expect(standard?.models.get("gpt-4o")).toBe(0.005);
	});
});

describe("getTieredCostEntries", () => {
	it("should return entries filtered by runId", () => {
		recordTieredCost({
			runId: "run-1",
			taskId: "TASK-001",
			agentRole: "BUILDER",
			tier: ExecutionTier.Routine,
			model: "gpt-4o-mini",
			inputTokens: 500,
			outputTokens: 200,
			cost: 0.001,
		});
		recordTieredCost({
			runId: "run-2",
			taskId: "TASK-001",
			agentRole: "BUILDER",
			tier: ExecutionTier.Standard,
			model: "gpt-4o",
			inputTokens: 500,
			outputTokens: 200,
			cost: 0.005,
		});

		expect(getTieredCostEntries("run-1")).toHaveLength(1);
		expect(getTieredCostEntries("run-2")).toHaveLength(1);
	});
});

describe("computeBenchmark", () => {
	it("should compute savings vs fixed model", () => {
		// Routine task: uses cheap gpt-4o-mini
		recordTieredCost({
			runId: "run-1",
			taskId: "TASK-001",
			agentRole: "BUILDER",
			tier: ExecutionTier.Routine,
			model: "gpt-4o-mini",
			inputTokens: 1000,
			outputTokens: 500,
			cost: 0.00045, // mini pricing
		});
		// Standard task: uses gpt-4o (same as baseline)
		recordTieredCost({
			runId: "run-1",
			taskId: "TASK-002",
			agentRole: "VERIFIER",
			tier: ExecutionTier.Standard,
			model: "gpt-4o",
			inputTokens: 1000,
			outputTokens: 500,
			cost: 0.0125, // gpt-4o pricing
		});

		const benchmark = computeBenchmark("run-1");
		expect(benchmark.sigmaRoutedCost).toBeCloseTo(0.01295, 4);
		expect(benchmark.fixedModelCost).toBeCloseTo(0.025, 4); // both at gpt-4o rates
		expect(benchmark.savingsPercent).toBeGreaterThan(0);
		expect(benchmark.fixedModel).toBe("gpt-4o");
	});

	it("should return 0 savings for unknown run", () => {
		const benchmark = computeBenchmark("unknown");
		expect(benchmark.sigmaRoutedCost).toBe(0);
		expect(benchmark.fixedModelCost).toBe(0);
		expect(benchmark.savingsPercent).toBe(0);
	});

	it("should include tier breakdown", () => {
		recordTieredCost({
			runId: "run-1",
			taskId: "TASK-001",
			agentRole: "BUILDER",
			tier: ExecutionTier.Routine,
			model: "gpt-4o-mini",
			inputTokens: 500,
			outputTokens: 200,
			cost: 0.001,
		});

		const benchmark = computeBenchmark("run-1");
		expect(benchmark.tierBreakdown).toHaveLength(1);
		expect(benchmark.tierBreakdown[0]?.tier).toBe(ExecutionTier.Routine);
	});
});
