/**
 * ChargebackEntry — cost aggregation for chargeback reporting.
 */

export interface ChargebackEntry {
	poolId: string;
	poolName: string;
	tier: "ORG" | "TEAM" | "PROJECT";
	totalSpend: number;
	taskCount: number;
	topModels: Array<{ model: string; cost: number }>;
	topRoles: Array<{ role: string; cost: number }>;
}
