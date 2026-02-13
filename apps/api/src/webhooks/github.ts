/**
 * GitHub webhook handler.
 *
 * Receives GitHub App webhook events:
 * - workflow_run.completed — CI results → route to Verifier
 * - check_run.completed — individual check results
 * - pull_request.reviewed — PR review events
 *
 * Verifies signature, parses event, routes to appropriate handler.
 */

import { Router } from "express";
import { db } from "../db.js";
import { logAuditEvent } from "../services/audit-logger.js";
import type { GitHubCheckRunPayload, GitHubWorkflowRunPayload } from "../services/failure-normalizer.js";
import { normalizeCheckRun, normalizeWorkflowRun } from "../services/failure-normalizer.js";
import { verifyWebhookSignature } from "./verify-signature.js";

export const webhookRouter = Router();

/** Webhook event types we handle */
export type WebhookEventType = "workflow_run" | "check_run" | "pull_request_review" | "ping";

export interface WebhookEvent {
	type: WebhookEventType;
	action: string;
	payload: Record<string, unknown>;
}

/** Callback for routed webhook events */
export type WebhookEventHandler = (event: WebhookEvent) => void;

const eventHandlers: WebhookEventHandler[] = [];

/**
 * Register a handler for webhook events.
 */
export function onWebhookEvent(handler: WebhookEventHandler): void {
	eventHandlers.push(handler);
}

/**
 * Clear all event handlers (for testing).
 */
export function clearWebhookHandlers(): void {
	eventHandlers.length = 0;
}

/**
 * POST /api/webhooks/github
 * Receives GitHub App webhook events.
 */
webhookRouter.post("/github", (req, res) => {
	const secret = process.env.GITHUB_WEBHOOK_SECRET;
	const signature = req.headers["x-hub-signature-256"] as string | undefined;
	const eventType = req.headers["x-github-event"] as string | undefined;

	// If secret is configured, verify signature
	if (secret && signature) {
		const body = JSON.stringify(req.body);
		if (!verifyWebhookSignature(body, signature, secret)) {
			res.status(401).json({ error: "Invalid webhook signature" });
			return;
		}
	}

	if (!eventType) {
		res.status(400).json({ error: "Missing X-GitHub-Event header" });
		return;
	}

	// Handle ping event (GitHub sends this on webhook creation)
	if (eventType === "ping") {
		res.json({ message: "pong" });
		return;
	}

	const action = ((req.body as Record<string, unknown>).action as string) ?? "";

	const event: WebhookEvent = {
		type: eventType as WebhookEventType,
		action,
		payload: req.body as Record<string, unknown>,
	};

	// Route to registered handlers
	for (const handler of eventHandlers) {
		handler(event);
	}

	// Route based on event type and action
	if (eventType === "workflow_run" && action === "completed") {
		handleWorkflowRunCompleted(event.payload);
	} else if (eventType === "check_run" && action === "completed") {
		handleCheckRunCompleted(event.payload);
	} else if (eventType === "pull_request_review" && action === "submitted") {
		handlePRReview(event.payload);
	}

	res.json({ received: true, event: eventType, action });
});

// ─── Internal event handlers ─────────────────────────────────

function handleWorkflowRunCompleted(payload: Record<string, unknown>): void {
	const workflowRun = payload.workflow_run as Record<string, unknown> | undefined;
	if (!workflowRun) return;

	const conclusion = workflowRun.conclusion as string;
	const headBranch = workflowRun.head_branch as string;
	const ghRunId = workflowRun.id as number;

	console.log(`[Webhook] workflow_run completed: #${ghRunId} on ${headBranch} → ${conclusion}`);

	// Only store failures (not successful runs)
	if (conclusion !== "success") {
		const normalized = normalizeWorkflowRun(
			payload as unknown as GitHubWorkflowRunPayload,
			{ runId: `gh-${ghRunId}`, projectId: "github-ingest" },
		);

		db.failures
			.create(normalized as unknown as import("@blueflame/shared").NormalizedFailure, normalized.projectId)
			.then(() => {
				console.log(`[Webhook] Stored failure ${normalized.id} from workflow_run #${ghRunId}`);
			})
			.catch((err) => {
				console.error("[Webhook] Failed to store workflow_run failure:", err);
			});

		logAuditEvent({
			eventType: "AGENT",
			actor: "github-webhook",
			action: "ingest-failure",
			resource: `workflow_run/${ghRunId}`,
			outcome: "ALLOWED",
			details: `Ingested ${conclusion} workflow_run #${ghRunId} on ${headBranch}`,
		}).catch(() => {});
	}
}

function handleCheckRunCompleted(payload: Record<string, unknown>): void {
	const checkRun = payload.check_run as Record<string, unknown> | undefined;
	if (!checkRun) return;

	const conclusion = checkRun.conclusion as string;
	const name = checkRun.name as string;
	const checkId = checkRun.id as number;

	console.log(`[Webhook] check_run completed: ${name} → ${conclusion}`);

	// Only store failures
	if (conclusion !== "success" && conclusion !== "neutral" && conclusion !== "skipped") {
		const normalized = normalizeCheckRun(
			payload as unknown as GitHubCheckRunPayload,
			{ runId: `gh-check-${checkId}`, projectId: "github-ingest" },
		);

		db.failures
			.create(normalized as unknown as import("@blueflame/shared").NormalizedFailure, normalized.projectId)
			.then(() => {
				console.log(`[Webhook] Stored failure ${normalized.id} from check_run ${name}`);
			})
			.catch((err) => {
				console.error("[Webhook] Failed to store check_run failure:", err);
			});
	}
}

function handlePRReview(payload: Record<string, unknown>): void {
	const review = payload.review as Record<string, unknown> | undefined;
	if (!review) return;

	const state = review.state as string;
	const prNumber = (payload.pull_request as Record<string, unknown>)?.number;

	console.log(`[Webhook] PR review: #${prNumber} → ${state}`);

	logAuditEvent({
		eventType: "GOVERNANCE",
		actor: (review.user as Record<string, unknown>)?.login as string ?? "unknown",
		action: "pr-review",
		resource: `PR #${prNumber}`,
		outcome: state === "approved" ? "ALLOWED" : "DENIED",
		details: `PR #${prNumber} review: ${state}`,
	}).catch(() => {});
}
