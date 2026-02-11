/**
 * Failure store — in-memory store for normalized CI/CD failures.
 *
 * Stores NormalizedFailure documents from webhook handlers (ADO, GitHub Actions).
 * For MVP, uses in-memory Map. Production will use Cosmos DB failures container.
 *
 * Source: Blueflame-Spec-v3-ACAR.md Section 10.3
 */

import type { NormalizedFailure } from "@blueflame/shared";

/** In-memory failure store for MVP */
const failures = new Map<string, NormalizedFailure>();

/**
 * Store a normalized failure.
 */
export function storeFailure(failure: NormalizedFailure): void {
	failures.set(failure.failureId, failure);
}

/**
 * Get a failure by ID.
 */
export function getFailure(failureId: string): NormalizedFailure | undefined {
	return failures.get(failureId);
}

/**
 * Get all failures for a run.
 */
export function getFailuresByRunId(runId: string): NormalizedFailure[] {
	const results: NormalizedFailure[] = [];
	for (const failure of failures.values()) {
		if (failure.runId === runId) {
			results.push(failure);
		}
	}
	return results;
}

/**
 * Get all failures for a project.
 */
export function getFailuresByProjectId(projectId: string): NormalizedFailure[] {
	const results: NormalizedFailure[] = [];
	for (const failure of failures.values()) {
		if (failure.projectId === projectId) {
			results.push(failure);
		}
	}
	return results;
}

/**
 * Get all stored failures.
 */
export function getAllFailures(): NormalizedFailure[] {
	return Array.from(failures.values());
}

/**
 * Clear all failures (for testing).
 */
export function clearAllFailures(): void {
	failures.clear();
}
