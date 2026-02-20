/**
 * Remediation service — manages failure → analysis → new plan.lock lifecycle.
 *
 * Uses in-memory cache with Cosmos DB write-through for persistence.
 * Documents stored in "documents" container with type "remediation".
 *
 * Source: Blueflame-Spec-v3-ACAR.md Section 10.5
 */

import { analyzeFailure } from "@blueflame/foundry";
import type { FixerConfig } from "@blueflame/foundry";
import type { Remediation, RootCauseAnalysis } from "@blueflame/shared";
import { RemediationStatus } from "@blueflame/shared";
import { db } from "../db.js";
import { getFailure } from "./failure-store.js";

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
 * Override all non-completed remediations linked to a specific task.
 * Matches by failureId pattern: `fail-{runId}-{taskId}-*`.
 * Returns the number of remediations overridden.
 */
export function overrideRemediationsForTask(runId: string, taskId: string): number {
	let count = 0;
	const prefix = `fail-${runId}-${taskId}-`;
	for (const rem of remediations.values()) {
		if (
			rem.runId === runId &&
			rem.failureId.startsWith(prefix) &&
			rem.status !== RemediationStatus.Completed
		) {
			rem.status = RemediationStatus.Overridden;
			rem.updatedAt = new Date().toISOString();
			persistRemediation(rem);
			count++;
		}
	}
	return count;
}

/**
 * Mark remediation as overridden (admin override of the associated task).
 * Accepts any non-COMPLETED status — if already completed, no-op.
 */
export function overrideRemediation(remediationId: string): Remediation | null {
	const rem = remediations.get(remediationId);
	if (!rem || rem.status === RemediationStatus.Completed) return null;

	rem.status = RemediationStatus.Overridden;
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
 * On-demand root cause analysis — gets or creates a remediation for a failure,
 * runs AI analysis via Azure OpenAI, and returns the remediation with rootCause.
 *
 * Unlike autoAnalyzeFailure() in orchestrator (fire-and-forget), this is
 * synchronously awaited so the frontend gets the result immediately.
 */
export async function triggerAnalysis(
	failureId: string,
	runId: string,
	projectId: string,
): Promise<Remediation | null> {
	// Check if remediation already exists with root cause
	const existing = await getRemediationsByFailureId(failureId);
	const first = existing[0] as Remediation | undefined;
	if (first?.rootCause) {
		return first;
	}

	// Get or create remediation
	let rem: Remediation;
	if (first) {
		rem = first;
	} else {
		rem = createRemediation({
			failureId,
			runId,
			projectId,
			parentLockId: `auto-${Date.now()}`,
		});
	}

	// Transition to ANALYZING if still PENDING
	if (rem.status === RemediationStatus.Pending) {
		const analyzed = startAnalysis(rem.remediationId);
		if (analyzed) rem = analyzed;
	}

	// Load the failure from Cosmos
	const failure = await getFailure(failureId);
	if (!failure) {
		console.error(`[remediation] triggerAnalysis: failure not found: ${failureId}`);
		return rem;
	}

	// Build Fixer config from env vars (same pattern as orchestrator.autoAnalyzeFailure)
	const endpoint = process.env.FOUNDRY_ENDPOINT ?? process.env.AZURE_OPENAI_ENDPOINT ?? "";
	const apiKey = process.env.FOUNDRY_API_KEY ?? process.env.AZURE_OPENAI_API_KEY ?? "";
	if (!endpoint || !apiKey) {
		console.error("[remediation] triggerAnalysis: no Azure OpenAI credentials configured");
		return rem;
	}

	const config: FixerConfig = {
		endpoint,
		apiKey,
		deployment: "gpt-4o-mini",
		apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-12-01-preview",
	};

	// Run AI analysis (synchronously awaited)
	const result = await analyzeFailure(config, failure);
	if (result.ok) {
		const updated = attachRootCause(rem.remediationId, result.value.rootCause);
		if (updated) return updated;
	} else {
		console.error(`[remediation] triggerAnalysis failed for ${failureId}:`, result.error.error);
	}

	return rem;
}

/**
 * Clear all remediations (for testing).
 */
export function clearAllRemediations(): void {
	remediations.clear();
	remCounter = 0;
}
