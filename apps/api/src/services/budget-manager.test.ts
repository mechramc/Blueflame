import { afterEach, describe, expect, it } from "vitest";

import {
	BudgetTier,
	checkBudgetAlerts,
	clearBudgetData,
	createBudgetPool,
	generateChargeback,
	getBudgetPool,
	getChildPools,
	recordSpend,
} from "./budget-manager.js";

afterEach(() => {
	clearBudgetData();
});

describe("createBudgetPool", () => {
	it("should create an org-level pool", () => {
		const pool = createBudgetPool({
			name: "Contoso Engineering",
			tier: BudgetTier.Org,
			parentId: null,
			budgetCeiling: 10000,
		});

		expect(pool.name).toBe("Contoso Engineering");
		expect(pool.tier).toBe(BudgetTier.Org);
		expect(pool.budgetCeiling).toBe(10000);
		expect(pool.currentSpend).toBe(0);
	});

	it("should create a team pool under org", () => {
		const org = createBudgetPool({
			name: "Org",
			tier: BudgetTier.Org,
			parentId: null,
			budgetCeiling: 10000,
		});

		const team = createBudgetPool({
			name: "Frontend Team",
			tier: BudgetTier.Team,
			parentId: org.id,
			budgetCeiling: 3000,
		});

		expect(team.parentId).toBe(org.id);
	});
});

describe("getChildPools", () => {
	it("should list children of a parent pool", () => {
		const org = createBudgetPool({
			name: "Org",
			tier: BudgetTier.Org,
			parentId: null,
			budgetCeiling: 10000,
		});

		createBudgetPool({
			name: "Team A",
			tier: BudgetTier.Team,
			parentId: org.id,
			budgetCeiling: 3000,
		});
		createBudgetPool({
			name: "Team B",
			tier: BudgetTier.Team,
			parentId: org.id,
			budgetCeiling: 5000,
		});

		expect(getChildPools(org.id)).toHaveLength(2);
	});
});

describe("recordSpend", () => {
	it("should record spend and update pool", () => {
		const pool = createBudgetPool({
			name: "Team A",
			tier: BudgetTier.Team,
			parentId: null,
			budgetCeiling: 100,
		});

		const record = recordSpend({
			poolId: pool.id,
			runId: "run-1",
			taskId: "TASK-001",
			agentRole: "BUILDER",
			model: "gpt-4o",
			inputTokens: 1000,
			outputTokens: 500,
			cost: 0.05,
		});

		expect(record).not.toBeNull();
		expect(getBudgetPool(pool.id)?.currentSpend).toBe(0.05);
	});

	it("should roll up spend to parent pools", () => {
		const org = createBudgetPool({
			name: "Org",
			tier: BudgetTier.Org,
			parentId: null,
			budgetCeiling: 10000,
		});
		const team = createBudgetPool({
			name: "Team A",
			tier: BudgetTier.Team,
			parentId: org.id,
			budgetCeiling: 3000,
		});

		recordSpend({
			poolId: team.id,
			runId: "run-1",
			taskId: "TASK-001",
			agentRole: "BUILDER",
			model: "gpt-4o",
			inputTokens: 1000,
			outputTokens: 500,
			cost: 10,
		});

		expect(getBudgetPool(team.id)?.currentSpend).toBe(10);
		expect(getBudgetPool(org.id)?.currentSpend).toBe(10);
	});

	it("should return null for unknown pool", () => {
		expect(
			recordSpend({
				poolId: "unknown",
				runId: "run-1",
				taskId: "TASK-001",
				agentRole: "BUILDER",
				model: "gpt-4o",
				inputTokens: 100,
				outputTokens: 50,
				cost: 0.01,
			}),
		).toBeNull();
	});
});

describe("checkBudgetAlerts", () => {
	it("should return WARNING at 80%", () => {
		const pool = createBudgetPool({
			name: "Team",
			tier: BudgetTier.Team,
			parentId: null,
			budgetCeiling: 100,
		});
		recordSpend({
			poolId: pool.id,
			runId: "r1",
			taskId: "T1",
			agentRole: "BUILDER",
			model: "gpt-4o",
			inputTokens: 100,
			outputTokens: 50,
			cost: 82,
		});

		const alert = checkBudgetAlerts(pool.id);
		expect(alert).not.toBeNull();
		expect(alert?.severity).toBe("WARNING");
	});

	it("should return CRITICAL at 95%", () => {
		const pool = createBudgetPool({
			name: "Team",
			tier: BudgetTier.Team,
			parentId: null,
			budgetCeiling: 100,
		});
		recordSpend({
			poolId: pool.id,
			runId: "r1",
			taskId: "T1",
			agentRole: "BUILDER",
			model: "gpt-4o",
			inputTokens: 100,
			outputTokens: 50,
			cost: 96,
		});

		const alert = checkBudgetAlerts(pool.id);
		expect(alert?.severity).toBe("CRITICAL");
	});

	it("should return EXCEEDED at 100%+", () => {
		const pool = createBudgetPool({
			name: "Team",
			tier: BudgetTier.Team,
			parentId: null,
			budgetCeiling: 100,
		});
		recordSpend({
			poolId: pool.id,
			runId: "r1",
			taskId: "T1",
			agentRole: "BUILDER",
			model: "gpt-4o",
			inputTokens: 100,
			outputTokens: 50,
			cost: 105,
		});

		const alert = checkBudgetAlerts(pool.id);
		expect(alert?.severity).toBe("EXCEEDED");
	});

	it("should return null when under 80%", () => {
		const pool = createBudgetPool({
			name: "Team",
			tier: BudgetTier.Team,
			parentId: null,
			budgetCeiling: 100,
		});
		recordSpend({
			poolId: pool.id,
			runId: "r1",
			taskId: "T1",
			agentRole: "BUILDER",
			model: "gpt-4o",
			inputTokens: 100,
			outputTokens: 50,
			cost: 50,
		});

		expect(checkBudgetAlerts(pool.id)).toBeNull();
	});
});

describe("generateChargeback", () => {
	it("should produce chargeback entries per child pool", () => {
		const org = createBudgetPool({
			name: "Org",
			tier: BudgetTier.Org,
			parentId: null,
			budgetCeiling: 10000,
		});
		const teamA = createBudgetPool({
			name: "Team A",
			tier: BudgetTier.Team,
			parentId: org.id,
			budgetCeiling: 5000,
		});
		const teamB = createBudgetPool({
			name: "Team B",
			tier: BudgetTier.Team,
			parentId: org.id,
			budgetCeiling: 5000,
		});

		recordSpend({
			poolId: teamA.id,
			runId: "r1",
			taskId: "T1",
			agentRole: "BUILDER",
			model: "gpt-4o",
			inputTokens: 100,
			outputTokens: 50,
			cost: 10,
		});
		recordSpend({
			poolId: teamB.id,
			runId: "r2",
			taskId: "T2",
			agentRole: "VERIFIER",
			model: "gpt-4o-mini",
			inputTokens: 50,
			outputTokens: 20,
			cost: 5,
		});

		const entries = generateChargeback(org.id);
		expect(entries).toHaveLength(2);

		const teamAEntry = entries.find((e) => e.poolName === "Team A");
		expect(teamAEntry?.totalSpend).toBe(10);
		expect(teamAEntry?.taskCount).toBe(1);
	});
});
