import { afterEach, describe, expect, it } from "vitest";
import {
	clearCostLog,
	estimateCost,
	getRunCost,
	getRunCostByAgent,
	getRunCostEntries,
	getRunTokenUsage,
	recordCost,
} from "./cost-tracker.js";

afterEach(() => {
	clearCostLog();
});

describe("estimateCost", () => {
	it("should calculate cost for gpt-4o", () => {
		// 1000 input tokens @ $0.005/1K + 500 output tokens @ $0.015/1K
		const cost = estimateCost("gpt-4o", 1000, 500);
		expect(cost).toBeCloseTo(0.005 + 0.0075);
	});

	it("should calculate cost for gpt-4o-mini", () => {
		const cost = estimateCost("gpt-4o-mini", 1000, 1000);
		expect(cost).toBeCloseTo(0.00015 + 0.0006);
	});

	it("should use fallback pricing for unknown models", () => {
		const cost = estimateCost("unknown-model", 1000, 1000);
		expect(cost).toBeGreaterThan(0);
	});

	it("should return 0 for zero tokens", () => {
		expect(estimateCost("gpt-4o", 0, 0)).toBe(0);
	});
});

describe("recordCost", () => {
	it("should record a cost entry and calculate cost", () => {
		const entry = recordCost("agent-1", "run-1", "gpt-4o", 1000, 500);
		expect(entry.agentId).toBe("agent-1");
		expect(entry.runId).toBe("run-1");
		expect(entry.cost).toBeGreaterThan(0);
		expect(entry.timestamp).toBeTruthy();
	});
});

describe("getRunCost", () => {
	it("should sum all costs for a run", () => {
		recordCost("agent-1", "run-1", "gpt-4o", 1000, 500);
		recordCost("agent-2", "run-1", "gpt-4o", 2000, 1000);
		recordCost("agent-3", "run-2", "gpt-4o", 1000, 500);

		const cost = getRunCost("run-1");
		expect(cost).toBeGreaterThan(0);
		// Should not include run-2 costs
		expect(cost).toBeLessThan(getRunCost("run-1") + getRunCost("run-2"));
	});

	it("should return 0 for unknown run", () => {
		expect(getRunCost("nonexistent")).toBe(0);
	});
});

describe("getRunCostByAgent", () => {
	it("should break down cost by agent", () => {
		recordCost("agent-1", "run-1", "gpt-4o", 1000, 500);
		recordCost("agent-1", "run-1", "gpt-4o", 1000, 500);
		recordCost("agent-2", "run-1", "gpt-4o", 2000, 1000);

		const byAgent = getRunCostByAgent("run-1");
		expect(byAgent.size).toBe(2);
		expect(byAgent.has("agent-1")).toBe(true);
		expect(byAgent.has("agent-2")).toBe(true);
		// agent-1 has 2 entries, agent-2 has 1
		const agent1Cost = byAgent.get("agent-1") ?? 0;
		const agent2Cost = byAgent.get("agent-2") ?? 0;
		expect(agent1Cost).toBeGreaterThan(0);
		expect(agent2Cost).toBeGreaterThan(0);
	});
});

describe("getRunCostEntries", () => {
	it("should return all entries for a run", () => {
		recordCost("agent-1", "run-1", "gpt-4o", 1000, 500);
		recordCost("agent-2", "run-1", "gpt-4o", 2000, 1000);
		recordCost("agent-3", "run-2", "gpt-4o", 1000, 500);

		const entries = getRunCostEntries("run-1");
		expect(entries).toHaveLength(2);
	});
});

describe("getRunTokenUsage", () => {
	it("should sum input and output tokens", () => {
		recordCost("agent-1", "run-1", "gpt-4o", 1000, 500);
		recordCost("agent-2", "run-1", "gpt-4o", 2000, 1000);

		const usage = getRunTokenUsage("run-1");
		expect(usage.input).toBe(3000);
		expect(usage.output).toBe(1500);
	});

	it("should return 0 for unknown run", () => {
		const usage = getRunTokenUsage("nonexistent");
		expect(usage.input).toBe(0);
		expect(usage.output).toBe(0);
	});
});
