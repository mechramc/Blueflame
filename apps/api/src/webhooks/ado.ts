/**
 * Azure DevOps webhook handler.
 *
 * Receives ADO Service Hook events for pipeline failures.
 * Normalizes to provider-agnostic failure schema.
 * Routes to failure store for analysis.
 *
 * Source: Blueflame-Spec-v3-ACAR.md Section 10.2
 */

import { FailureSource, FailureType } from "@blueflame/shared";
import type { FailedStep, NormalizedFailure, TestResults } from "@blueflame/shared";
import { Router } from "express";
import { storeFailure } from "../services/failure-store.js";
import { verifyWebhookSignature } from "./verify-signature.js";

export const adoWebhookRouter = Router();

/** ADO Service Hook event types we handle */
export type AdoEventType = "build.complete" | "ms.vss-pipelines.run-state-changed-event";

/** Callback for ADO webhook events */
export type AdoWebhookHandler = (failure: NormalizedFailure) => void;

const adoHandlers: AdoWebhookHandler[] = [];

/**
 * Register a handler for ADO failure events.
 */
export function onAdoFailure(handler: AdoWebhookHandler): void {
	adoHandlers.push(handler);
}

/**
 * Clear all handlers (for testing).
 */
export function clearAdoHandlers(): void {
	adoHandlers.length = 0;
}

/**
 * POST /api/webhooks/ado
 * Receives Azure DevOps Service Hook events.
 */
adoWebhookRouter.post("/ado", (req, res) => {
	const secret = process.env.ADO_WEBHOOK_SECRET;
	const signature = req.headers["x-ado-signature"] as string | undefined;

	// If secret is configured, verify signature
	if (secret && signature) {
		const body = JSON.stringify(req.body);
		if (!verifyWebhookSignature(body, signature, secret)) {
			res.status(401).json({ error: "Invalid webhook signature" });
			return;
		}
	}

	const payload = req.body as Record<string, unknown>;
	const eventType = payload.eventType as string | undefined;

	if (!eventType) {
		res.status(400).json({ error: "Missing eventType in payload" });
		return;
	}

	// Only process build completions that failed
	if (eventType === "build.complete") {
		const failure = normalizeBuildComplete(payload);
		if (failure) {
			storeFailure(failure);
			for (const handler of adoHandlers) {
				handler(failure);
			}
			res.json({ received: true, failureId: failure.failureId });
			return;
		}
		// Build succeeded — no failure to store
		res.json({ received: true, skipped: "build succeeded" });
		return;
	}

	res.json({ received: true, event: eventType, skipped: "unhandled event type" });
});

/**
 * Normalize an ADO build.complete event into a NormalizedFailure.
 * Returns null if the build succeeded.
 */
export function normalizeBuildComplete(payload: Record<string, unknown>): NormalizedFailure | null {
	const resource = payload.resource as Record<string, unknown> | undefined;
	if (!resource) return null;

	const result = resource.result as string | undefined;
	// ADO build results: succeeded, partiallySucceeded, failed, canceled
	if (result === "succeeded") return null;

	const buildNumber = String(resource.buildNumber ?? resource.id ?? "unknown");
	const definition = resource.definition as Record<string, unknown> | undefined;
	const pipelineId = String(definition?.id ?? "unknown");

	// Extract branch and commit
	const sourceBranch = String(resource.sourceBranch ?? "unknown");
	const sourceVersion = String(resource.sourceVersion ?? "unknown");

	// Determine failure type from build result
	let failureType = FailureType.Build;
	if (result === "canceled") {
		failureType = FailureType.Timeout;
	}

	// Extract failed steps from timeline (if present)
	const failedSteps = extractFailedSteps(resource);

	// Extract test results (if present)
	const testResults = extractTestResults(resource);
	if (testResults && testResults.failed > 0) {
		failureType = FailureType.Test;
	}

	// Build log URL
	const url = resource.url as string | undefined;
	const rawLogUrl = url ? `${url}/logs` : "";

	const failureId = `FAIL-${buildNumber}-${Date.now()}`;

	return {
		id: failureId,
		failureId,
		runId: extractRunId(resource) ?? "unknown",
		projectId: extractProjectId(payload) ?? "unknown",
		source: FailureSource.AzureDevOps,
		pipelineId,
		buildNumber,
		failureType,
		failedSteps,
		testResults,
		environment: {
			os: String((resource.queue as Record<string, unknown>)?.name ?? "hosted"),
			runtimeVersion: "unknown",
		},
		branchRef: sourceBranch,
		commitSha: sourceVersion,
		timestamp: String(resource.finishTime ?? new Date().toISOString()),
		rawLogUrl,
		ttl: 2592000, // 30 days
	};
}

/**
 * Extract failed steps from ADO build timeline records.
 */
function extractFailedSteps(resource: Record<string, unknown>): FailedStep[] {
	const timeline = resource.timeline as Record<string, unknown> | undefined;
	if (!timeline) return [];

	const records = timeline.records as Array<Record<string, unknown>> | undefined;
	if (!Array.isArray(records)) return [];

	return records
		.filter((r) => r.result === "failed" || r.result === "skipped")
		.map((r) => ({
			name: String(r.name ?? "unknown"),
			exitCode: Number(r.errorCount ?? 1),
			logExcerpt: String((r.issues as string[] | undefined)?.[0] ?? "").slice(0, 2000),
			durationSeconds: 0,
		}));
}

/**
 * Extract test results from ADO build resource.
 */
function extractTestResults(resource: Record<string, unknown>): TestResults | null {
	const testRuns = resource.testResults as Record<string, unknown> | undefined;
	if (!testRuns) return null;

	return {
		total: Number(testRuns.totalTests ?? 0),
		passed: Number(testRuns.passedTests ?? 0),
		failed: Number(testRuns.failedTests ?? 0),
		skipped: Number(testRuns.skippedTests ?? 0),
		details: [],
	};
}

/**
 * Try to extract a Blueflame run ID from ADO build tags or branch name.
 */
function extractRunId(resource: Record<string, unknown>): string | null {
	// Check tags for blueflame-run-{id} pattern
	const tags = resource.tags as string[] | undefined;
	if (Array.isArray(tags)) {
		for (const tag of tags) {
			if (tag.startsWith("blueflame-run-")) {
				return tag.replace("blueflame-run-", "");
			}
		}
	}

	// Check branch name for blueflame/run-{id} pattern
	const branch = String(resource.sourceBranch ?? "");
	const match = branch.match(/blueflame\/run-([^/]+)/);
	if (match?.[1]) return match[1];

	return null;
}

/**
 * Extract project ID from ADO webhook payload.
 */
function extractProjectId(payload: Record<string, unknown>): string | null {
	const resourceContainers = payload.resourceContainers as Record<string, unknown> | undefined;
	if (!resourceContainers) return null;

	const project = resourceContainers.project as Record<string, unknown> | undefined;
	return project ? String(project.id ?? null) : null;
}
