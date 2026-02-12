/**
 * Enterprise Budget Manager — org-level budget pools and team allocation.
 *
 * Provides hierarchical budget management: org → team → project.
 * Tracks spend, enforces ceilings, and produces chargeback reports.
 *
 * Source: Blueflame-Spec-v3-ACAR.md Section 16 (Enterprise Budgeting)
 */

/** Budget tier in the org hierarchy */
export enum BudgetTier {
	Org = "ORG",
	Team = "TEAM",
	Project = "PROJECT",
}

/** A budget pool at any tier */
export interface BudgetPool {
	id: string;
	name: string;
	tier: BudgetTier;
	parentId: string | null;
	budgetCeiling: number;
	currentSpend: number;
	currency: string;
	createdAt: string;
	updatedAt: string;
}

/** A spend record for chargeback tracking */
export interface SpendRecord {
	id: string;
	poolId: string;
	runId: string;
	taskId: string;
	agentRole: string;
	model: string;
	inputTokens: number;
	outputTokens: number;
	cost: number;
	timestamp: string;
}

/** Chargeback summary per team/project */
export interface ChargebackEntry {
	poolId: string;
	poolName: string;
	tier: BudgetTier;
	totalSpend: number;
	taskCount: number;
	topModels: Array<{ model: string; cost: number }>;
	topRoles: Array<{ role: string; cost: number }>;
}

/** Budget alert */
export interface BudgetAlert {
	poolId: string;
	poolName: string;
	percentUsed: number;
	currentSpend: number;
	ceiling: number;
	severity: "WARNING" | "CRITICAL" | "EXCEEDED";
}

/** In-memory budget store for MVP */
const pools = new Map<string, BudgetPool>();
const spendRecords: SpendRecord[] = [];
let recordCounter = 0;
let poolCounter = 0;

/**
 * Create a budget pool.
 */
export function createBudgetPool(params: {
	name: string;
	tier: BudgetTier;
	parentId: string | null;
	budgetCeiling: number;
	currency?: string;
}): BudgetPool {
	poolCounter++;
	const id = `pool-${params.tier.toLowerCase()}-${poolCounter}`;
	const pool: BudgetPool = {
		id,
		name: params.name,
		tier: params.tier,
		parentId: params.parentId,
		budgetCeiling: params.budgetCeiling,
		currentSpend: 0,
		currency: params.currency ?? "USD",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};
	pools.set(id, pool);
	return pool;
}

/**
 * Get a budget pool by ID.
 */
export function getBudgetPool(id: string): BudgetPool | undefined {
	return pools.get(id);
}

/**
 * List child pools for a parent.
 */
export function getChildPools(parentId: string): BudgetPool[] {
	return [...pools.values()].filter((p) => p.parentId === parentId);
}

/**
 * Record spend against a pool (rolls up to parent pools).
 */
export function recordSpend(params: {
	poolId: string;
	runId: string;
	taskId: string;
	agentRole: string;
	model: string;
	inputTokens: number;
	outputTokens: number;
	cost: number;
}): SpendRecord | null {
	const pool = pools.get(params.poolId);
	if (!pool) return null;

	recordCounter++;
	const record: SpendRecord = {
		id: `spend-${recordCounter}`,
		poolId: params.poolId,
		runId: params.runId,
		taskId: params.taskId,
		agentRole: params.agentRole,
		model: params.model,
		inputTokens: params.inputTokens,
		outputTokens: params.outputTokens,
		cost: params.cost,
		timestamp: new Date().toISOString(),
	};

	spendRecords.push(record);

	// Roll up spend to pool and ancestors
	let current: BudgetPool | undefined = pool;
	while (current) {
		current.currentSpend += params.cost;
		current.updatedAt = new Date().toISOString();
		current = current.parentId ? pools.get(current.parentId) : undefined;
	}

	return record;
}

/**
 * Check budget alerts for a pool.
 */
export function checkBudgetAlerts(poolId: string): BudgetAlert | null {
	const pool = pools.get(poolId);
	if (!pool || pool.budgetCeiling <= 0) return null;

	const percentUsed = (pool.currentSpend / pool.budgetCeiling) * 100;

	if (percentUsed >= 100) {
		return {
			poolId: pool.id,
			poolName: pool.name,
			percentUsed,
			currentSpend: pool.currentSpend,
			ceiling: pool.budgetCeiling,
			severity: "EXCEEDED",
		};
	}
	if (percentUsed >= 95) {
		return {
			poolId: pool.id,
			poolName: pool.name,
			percentUsed,
			currentSpend: pool.currentSpend,
			ceiling: pool.budgetCeiling,
			severity: "CRITICAL",
		};
	}
	if (percentUsed >= 80) {
		return {
			poolId: pool.id,
			poolName: pool.name,
			percentUsed,
			currentSpend: pool.currentSpend,
			ceiling: pool.budgetCeiling,
			severity: "WARNING",
		};
	}

	return null;
}

/**
 * Generate chargeback entries for a pool's children.
 */
export function generateChargeback(parentPoolId: string): ChargebackEntry[] {
	const children = getChildPools(parentPoolId);
	const entries: ChargebackEntry[] = [];

	for (const child of children) {
		const childRecords = spendRecords.filter((r) => r.poolId === child.id);

		// Aggregate by model
		const modelCosts = new Map<string, number>();
		const roleCosts = new Map<string, number>();

		for (const record of childRecords) {
			modelCosts.set(record.model, (modelCosts.get(record.model) ?? 0) + record.cost);
			roleCosts.set(record.agentRole, (roleCosts.get(record.agentRole) ?? 0) + record.cost);
		}

		entries.push({
			poolId: child.id,
			poolName: child.name,
			tier: child.tier,
			totalSpend: child.currentSpend,
			taskCount: childRecords.length,
			topModels: [...modelCosts.entries()]
				.map(([model, cost]) => ({ model, cost }))
				.sort((a, b) => b.cost - a.cost)
				.slice(0, 5),
			topRoles: [...roleCosts.entries()]
				.map(([role, cost]) => ({ role, cost }))
				.sort((a, b) => b.cost - a.cost),
		});
	}

	return entries;
}

/**
 * Clear all budget data (for testing).
 */
export function clearBudgetData(): void {
	pools.clear();
	spendRecords.length = 0;
	recordCounter = 0;
	poolCounter = 0;
}
