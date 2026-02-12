/**
 * Failure store — stores normalized CI/CD failures in Cosmos DB.
 *
 * Stores NormalizedFailure documents from webhook handlers (ADO, GitHub Actions).
 * Uses Cosmos DB failures container via @blueflame/cosmos.
 *
 * Source: Blueflame-Spec-v3-ACAR.md Section 10.3
 */

import type { NormalizedFailure } from "@blueflame/shared";
import { db } from "../db.js";

/**
 * Store a normalized failure.
 */
export async function storeFailure(failure: NormalizedFailure): Promise<void> {
	const result = await db.failures.create(failure as NormalizedFailure & { id: string }, failure.projectId);
	if (!result.ok) {
		console.warn(`[FailureStore] Failed to store failure ${failure.failureId}:`, result.error.message);
	}
}

/**
 * Get a failure by ID.
 */
export async function getFailure(failureId: string): Promise<NormalizedFailure | undefined> {
	// Cross-partition query since we don't know projectId from failureId alone
	const results = await db.failures.queryAll({
		query: "SELECT * FROM c WHERE c.failureId = @fid",
		parameters: [{ name: "@fid", value: failureId }],
	});
	return results[0];
}

/**
 * Get all failures for a run.
 */
export async function getFailuresByRunId(
	runId: string,
	projectId?: string,
): Promise<NormalizedFailure[]> {
	if (projectId) {
		return db.failures.findByRun(runId, projectId);
	}
	// Cross-partition fallback
	return db.failures.queryAll({
		query: "SELECT * FROM c WHERE c.runId = @rid ORDER BY c.timestamp DESC",
		parameters: [{ name: "@rid", value: runId }],
	});
}

/**
 * Get all failures for a project.
 */
export async function getFailuresByProjectId(projectId: string): Promise<NormalizedFailure[]> {
	return db.failures.findByProject(projectId);
}

/**
 * Get all stored failures.
 */
export async function getAllFailures(): Promise<NormalizedFailure[]> {
	return db.failures.queryAll({
		query: "SELECT * FROM c ORDER BY c.timestamp DESC",
	});
}

/**
 * Clear all failures (for testing — no-op in production, tests mock db).
 */
export function clearAllFailures(): void {
	// No-op; tests mock the db module
}
