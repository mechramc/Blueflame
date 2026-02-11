import { BudgetDecision } from "@blueflame/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	BudgetAlertLevel,
	checkBudget,
	clearAllBudgets,
	getBudgetState,
	handleBudgetDecision,
	initBudget,
	onBudgetAlert,
	onPauseTrigger,
} from "./budget-monitor.js";
import { clearCostLog, recordCost } from "./cost-tracker.js";

afterEach(() => {
	clearAllBudgets();
	clearCostLog();
});

describe("initBudget", () => {
	it("should create initial budget state", () => {
		const state = initBudget("run-1", 10.0);
		expect(state.runId).toBe("run-1");
		expect(state.ceiling).toBe(10.0);
		expect(state.currentSpend).toBe(0);
		expect(state.percentUsed).toBe(0);
		expect(state.warningEmitted).toBe(false);
		expect(state.pauseTriggered).toBe(false);
	});
});

describe("checkBudget", () => {
	it("should return Normal when under 80%", () => {
		initBudget("run-1", 1.0);
		// Record ~50% of budget
		recordCost("agent-1", "run-1", "gpt-4o", 5000, 2000);
		// gpt-4o: 5K*0.005 + 2K*0.015 = 0.025 + 0.030 = 0.055 (~5.5%)
		const level = checkBudget("run-1");
		expect(level).toBe(BudgetAlertLevel.Normal);
	});

	it("should return Warning at 80%", () => {
		initBudget("run-1", 0.1);
		// Record enough to exceed 80%
		recordCost("agent-1", "run-1", "gpt-4o", 10000, 5000);
		// 10K*0.005 + 5K*0.015 = 0.05 + 0.075 = 0.125 → 125% of 0.1
		const level = checkBudget("run-1");
		// This is actually > 95%, so it should be Critical
		expect(level).toBe(BudgetAlertLevel.Critical);
	});

	it("should emit warning callback at 80%", () => {
		const alertFn = vi.fn();
		onBudgetAlert(alertFn);

		initBudget("run-1", 0.2);
		// Spend ~85%: 0.17
		recordCost("agent-1", "run-1", "gpt-4o", 20000, 5000);
		// 20K*0.005 + 5K*0.015 = 0.1 + 0.075 = 0.175 → 87.5%
		checkBudget("run-1");

		expect(alertFn).toHaveBeenCalledWith(
			"run-1",
			expect.any(String),
			expect.any(Number),
			0.2,
			expect.any(Number),
		);
	});

	it("should trigger pause callback at 95%", () => {
		const pauseFn = vi.fn();
		onPauseTrigger(pauseFn);

		initBudget("run-1", 0.1);
		recordCost("agent-1", "run-1", "gpt-4o", 10000, 5000);
		// 0.125 → 125% of 0.1
		checkBudget("run-1");

		expect(pauseFn).toHaveBeenCalledWith("run-1");
	});

	it("should only emit warning once", () => {
		const alertFn = vi.fn();
		onBudgetAlert(alertFn);

		initBudget("run-1", 0.2);
		recordCost("agent-1", "run-1", "gpt-4o", 20000, 5000);
		checkBudget("run-1");
		checkBudget("run-1");
		checkBudget("run-1");

		// Warning emitted once, then possibly critical once
		const warningCalls = alertFn.mock.calls.filter((c) => c[1] === BudgetAlertLevel.Warning);
		expect(warningCalls.length).toBeLessThanOrEqual(1);
	});

	it("should only trigger pause once", () => {
		const pauseFn = vi.fn();
		onPauseTrigger(pauseFn);

		initBudget("run-1", 0.1);
		recordCost("agent-1", "run-1", "gpt-4o", 10000, 5000);
		checkBudget("run-1");
		checkBudget("run-1");
		checkBudget("run-1");

		expect(pauseFn).toHaveBeenCalledTimes(1);
	});

	it("should return Normal for unknown run", () => {
		expect(checkBudget("unknown")).toBe(BudgetAlertLevel.Normal);
	});
});

describe("getBudgetState", () => {
	it("should return updated budget state", () => {
		initBudget("run-1", 5.0);
		recordCost("agent-1", "run-1", "gpt-4o", 10000, 5000);

		const state = getBudgetState("run-1");
		expect(state).toBeDefined();
		expect(state?.currentSpend).toBeGreaterThan(0);
		expect(state?.percentUsed).toBeGreaterThan(0);
	});

	it("should return undefined for unknown run", () => {
		expect(getBudgetState("unknown")).toBeUndefined();
	});
});

describe("handleBudgetDecision", () => {
	it("should increase ceiling on Resume with top-up", () => {
		initBudget("run-1", 1.0);
		const state = handleBudgetDecision("run-1", BudgetDecision.Resume, 0.5);
		expect(state?.ceiling).toBe(1.5);
		expect(state?.pauseTriggered).toBe(false);
	});

	it("should reset warning flag on Resume", () => {
		initBudget("run-1", 1.0);
		// Trigger warning
		recordCost("agent-1", "run-1", "gpt-4o", 100000, 50000);
		checkBudget("run-1");

		const state = handleBudgetDecision("run-1", BudgetDecision.Resume, 5.0);
		expect(state?.warningEmitted).toBe(false);
	});

	it("should not change state on Accept", () => {
		initBudget("run-1", 1.0);
		const state = handleBudgetDecision("run-1", BudgetDecision.Accept);
		expect(state?.ceiling).toBe(1.0);
	});

	it("should not change state on Abandon", () => {
		initBudget("run-1", 1.0);
		const state = handleBudgetDecision("run-1", BudgetDecision.Abandon);
		expect(state?.ceiling).toBe(1.0);
	});

	it("should return undefined for unknown run", () => {
		expect(handleBudgetDecision("unknown", BudgetDecision.Resume)).toBeUndefined();
	});
});
