/**
 * Remediation service — manages failure → analysis → new plan.lock lifecycle.
 *
 * Uses in-memory cache with Cosmos DB write-through for persistence.
 * Documents stored in "documents" container with type "remediation".
 *
 * Source: Blueflame-Spec-v3-ACAR.md Section 10.5
 */

import type { Remediation, RootCauseAnalysis } from "@blueflame/shared";
import { RemediationStatus } from "@blueflame/shared";
import { db } from "../db.js";

/** In-memory remediation cache — backed by Cosmos */
const remediations = new Map<string, Remediation>();
let remCounter = 0;

export interface CreateRemediationRequest {
	failureId: string;
	runId: string;
	projectId: string;
	parentLockId: string;
}

/**
 * Persist a remediation to Cosmos (fire-and-forget).
 */
function persistRemediation(rem: Remediation): void {
	const doc = { ...rem, type: "remediation" };
	db.documents
		.upsert(doc as never, rem.projectId)
		.catch((err) => console.error("[remediation] Cosmos persist failed:", err));
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
	persistRemediation(remediation);
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
	persistRemediation(rem);
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
	persistRemediation(rem);
	return rem;
}

/**
 * Authorize the remediation plan — attaches the new lock ID.
 */
export function authorizeRemediation(remediationId: string, lockId: string): Remediation | null {
	const rem = remediations.get(remediationId);
	if (!rem || rem.status !== RemediationStatus.PlanReady) return null;

	rem.remediationLockId = lockId;
	rem.status = RemediationStatus.Authorized;
	rem.updatedAt = new Date().toISOString();
	persistRemediation(rem);
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
	persistRemediation(rem);
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
	persistRemediation(rem);
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
	persistRemediation(rem);
	return rem;
}

/**
 * Get a remediation by ID. Falls back to Cosmos on cache miss.
 */
export async function getRemediation(remediationId: string): Promise<Remediation | undefined> {
	const cached = remediations.get(remediationId);
	if (cached) return cached;

	// Try Cosmos — remediation ID is also the document ID
	// We need projectId for partition key; try reading without partition (cross-partition)
	try {
		const docs = await db.documents.queryAll({
			query: "SELECT * FROM c WHERE c.id = @id AND c.type = 'remediation'",
			parameters: [{ name: "@id", value: remediationId }],
		});
		if (docs.length > 0) {
			const rem = docs[0] as unknown as Remediation;
			remediations.set(remediationId, rem);
			return rem;
		}
	} catch {
		// Cosmos unavailable
	}
	return undefined;
}

/**
 * Get a remediation by ID (synchronous, cache only).
 */
export function getRemediationSync(remediationId: string): Remediation | undefined {
	return remediations.get(remediationId);
}

/**
 * Get all remediations for a failure. Falls back to Cosmos on cache miss.
 */
export async function getRemediationsByFailureId(failureId: string): Promise<Remediation[]> {
	// Check in-memory cache first
	const cached: Remediation[] = [];
	for (const rem of remediations.values()) {
		if (rem.failureId === failureId) {
			cached.push(rem);
		}
	}
	if (cached.length > 0) return cached;

	// Fall back to Cosmos cross-partition query
	try {
		const docs = await db.documents.queryAll({
			query: "SELECT * FROM c WHERE c.type = 'remediation' AND c.failureId = @failureId",
			parameters: [{ name: "@failureId", value: failureId }],
		});
		for (const doc of docs) {
			const rem = doc as unknown as Remediation;
			if (rem.id && !remediations.has(rem.id)) {
				remediations.set(rem.id, rem);
			}
		}
		return docs.map((d) => d as unknown as Remediation);
	} catch {
		return [];
	}
}

/**
 * Get all remediations for a run. Falls back to Cosmos on cache miss.
 */
export async function getRemediationsByRunId(runId: string): Promise<Remediation[]> {
	// Check in-memory cache first
	const cached: Remediation[] = [];
	for (const rem of remediations.values()) {
		if (rem.runId === runId) {
			cached.push(rem);
		}
	}
	if (cached.length > 0) return cached;

	// Fall back to Cosmos cross-partition query
	try {
		const docs = await db.documents.queryAll({
			query: "SELECT * FROM c WHERE c.type = 'remediation' AND c.runId = @runId",
			parameters: [{ name: "@runId", value: runId }],
		});
		for (const doc of docs) {
			const rem = doc as unknown as Remediation;
			if (rem.id && !remediations.has(rem.id)) {
				remediations.set(rem.id, rem);
			}
		}
		return docs.map((d) => d as unknown as Remediation);
	} catch {
		return [];
	}
}

/**
 * Load remediations for a project from Cosmos into cache.
 */
export async function loadRemediationsFromCosmos(projectId: string): Promise<void> {
	try {
		const docs = await db.documents.findByType(projectId, "remediation");
		for (const doc of docs) {
			const rem = doc as unknown as Remediation;
			if (rem.id && !remediations.has(rem.id)) {
				remediations.set(rem.id, rem);
			}
		}
	} catch {
		// Cosmos unavailable
	}
}

/**
 * Clear all remediations (for testing).
 */
export function clearAllRemediations(): void {
	remediations.clear();
	remCounter = 0;
}
