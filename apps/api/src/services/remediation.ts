/**
 * Remediation service — manages failure → analysis → new plan.lock lifecycle.
 *
 * Creates Remediation records that link a failure to a root cause analysis
 * and (upon authorization) a new PlanLock. The new lock has parentLockId
 * pointing to the original lock — the original is NEVER modified.
 *
 * For MVP, uses in-memory store. Production will use Cosmos DB failures container.
 *
 * Source: Blueflame-Spec-v3-ACAR.md Section 10.5
 */

import type { Remediation, RootCauseAnalysis } from "@blueflame/shared";
import { RemediationStatus } from "@blueflame/shared";

/** In-memory remediation store for MVP */
const remediations = new Map<string, Remediation>();
let remCounter = 0;

export interface CreateRemediationRequest {
	failureId: string;
	runId: string;
	projectId: string;
	parentLockId: string;
}

/**
 * Create a new remediation record in PENDING state.
 */
export function createRemediation(req: CreateRemediationRequest): Remediation {
	remCounter += 1;
	const remediationId = `REM-${req.failureId}-${Date.now()}-${remCounter}`;
	const now = new Date().toISOString();

	const remediation: Remediation = {
		id: remediationId,
		remediationId,
		failureId: req.failureId,
		runId: req.runId,
		projectId: req.projectId,
		status: RemediationStatus.Pending,
		rootCause: null,
		remediationLockId: null,
		parentLockId: req.parentLockId,
		createdAt: now,
		updatedAt: now,
	};

	remediations.set(remediationId, remediation);
	return remediation;
}

/**
 * Transition remediation to ANALYZING state.
 */
export function startAnalysis(remediationId: string): Remediation | null {
	const rem = remediations.get(remediationId);
	if (!rem || rem.status !== RemediationStatus.Pending) return null;

	rem.status = RemediationStatus.Analyzing;
	rem.updatedAt = new Date().toISOString();
	return rem;
}

/**
 * Attach root cause analysis and transition to PLAN_READY.
 */
export function attachRootCause(
	remediationId: string,
	rootCause: RootCauseAnalysis,
): Remediation | null {
	const rem = remediations.get(remediationId);
	if (!rem || rem.status !== RemediationStatus.Analyzing) return null;

	rem.rootCause = rootCause;
	rem.status = RemediationStatus.PlanReady;
	rem.updatedAt = new Date().toISOString();
	return rem;
}

/**
 * Authorize the remediation plan — attaches the new lock ID.
 */
export function authorizeRemediation(
	remediationId: string,
	lockId: string,
): Remediation | null {
	const rem = remediations.get(remediationId);
	if (!rem || rem.status !== RemediationStatus.PlanReady) return null;

	rem.remediationLockId = lockId;
	rem.status = RemediationStatus.Authorized;
	rem.updatedAt = new Date().toISOString();
	return rem;
}

/**
 * Transition to EXECUTING state.
 */
export function startRemediationExecution(remediationId: string): Remediation | null {
	const rem = remediations.get(remediationId);
	if (!rem || rem.status !== RemediationStatus.Authorized) return null;

	rem.status = RemediationStatus.Executing;
	rem.updatedAt = new Date().toISOString();
	return rem;
}

/**
 * Mark remediation as completed.
 */
export function completeRemediation(remediationId: string): Remediation | null {
	const rem = remediations.get(remediationId);
	if (!rem || rem.status !== RemediationStatus.Executing) return null;

	rem.status = RemediationStatus.Completed;
	rem.updatedAt = new Date().toISOString();
	return rem;
}

/**
 * Mark remediation as failed.
 */
export function failRemediation(remediationId: string): Remediation | null {
	const rem = remediations.get(remediationId);
	if (!rem) return null;

	rem.status = RemediationStatus.Failed;
	rem.updatedAt = new Date().toISOString();
	return rem;
}

/**
 * Get a remediation by ID.
 */
export function getRemediation(remediationId: string): Remediation | undefined {
	return remediations.get(remediationId);
}

/**
 * Get all remediations for a failure.
 */
export function getRemediationsByFailureId(failureId: string): Remediation[] {
	const results: Remediation[] = [];
	for (const rem of remediations.values()) {
		if (rem.failureId === failureId) {
			results.push(rem);
		}
	}
	return results;
}

/**
 * Get all remediations for a run.
 */
export function getRemediationsByRunId(runId: string): Remediation[] {
	const results: Remediation[] = [];
	for (const rem of remediations.values()) {
		if (rem.runId === runId) {
			results.push(rem);
		}
	}
	return results;
}

/**
 * Clear all remediations (for testing).
 */
export function clearAllRemediations(): void {
	remediations.clear();
	remCounter = 0;
}
