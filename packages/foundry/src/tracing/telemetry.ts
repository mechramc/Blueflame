/**
 * OpenTelemetry tracing instrumentation for Blueflame agents.
 *
 * Provides span tracking for orchestrator operations, agent execution,
 * and model routing decisions. Dual output:
 *   1. In-memory span store (for dashboard UI / SignalR)
 *   2. Azure Application Insights (when APPLICATIONINSIGHTS_CONNECTION_STRING is set)
 *
 * Source: Blueflame-Spec-v3-ACAR.md Section 13 (Governance)
 */

import type { RoutingDecision } from "../routing/types.js";

/** Span status */
export enum SpanStatus {
	Ok = "OK",
	Error = "ERROR",
}

/** A single trace span representing an operation */
export interface TraceSpan {
	spanId: string;
	traceId: string;
	parentSpanId: string | null;
	operationName: string;
	startTime: string;
	endTime: string | null;
	durationMs: number | null;
	status: SpanStatus;
	attributes: Record<string, string | number | boolean>;
	events: SpanEvent[];
}

/** An event within a span */
export interface SpanEvent {
	name: string;
	timestamp: string;
	attributes: Record<string, string | number | boolean>;
}

/** Agent execution span attributes */
export interface AgentSpanAttributes {
	"agent.role": string;
	"agent.id": string;
	"agent.model": string;
	"task.id": string;
	"run.id": string;
	"routing.tier": string;
	"routing.sigma": number;
	"tokens.input"?: number;
	"tokens.output"?: number;
	"cost.usd"?: number;
}

// ─── App Insights Client ─────────────────────────────────────

/** Minimal interface for the App Insights TelemetryClient methods we use */
interface AppInsightsClient {
	trackDependency(telemetry: {
		name: string;
		dependencyTypeName: string;
		duration: number;
		resultCode: string;
		success: boolean;
		data?: string;
		properties?: Record<string, string>;
		measurements?: Record<string, number>;
	}): void;
	trackEvent(telemetry: {
		name: string;
		properties?: Record<string, string>;
		measurements?: Record<string, number>;
	}): void;
	flush(): void;
}

let appInsightsClient: AppInsightsClient | null = null;
let telemetryInitialized = false;

/**
 * Initialize Application Insights telemetry.
 * Call once at API startup. No-op if connection string is not set.
 */
export function initTelemetry(connectionString?: string): boolean {
	const connStr = connectionString ?? process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
	if (!connStr) {
		console.log("[Telemetry] No APPLICATIONINSIGHTS_CONNECTION_STRING — App Insights disabled");
		return false;
	}

	try {
		// Dynamic import to avoid hard dependency when not configured
		// For ESM, use createRequire from module
		import("node:module")
			.then(({ createRequire }) => {
				const require = createRequire(import.meta.url);
				const appInsights = require("applicationinsights");
				appInsights
					.setup(connStr)
					.setAutoCollectRequests(true)
					.setAutoCollectPerformance(true)
					.setAutoCollectExceptions(true)
					.setAutoCollectDependencies(false) // We track these manually
					.setAutoCollectConsole(false)
					.start();

				appInsightsClient = appInsights.defaultClient;
				telemetryInitialized = true;
			})
			.catch((error) => {
				console.warn("[Telemetry] Failed to initialize App Insights:", error.message);
			});
		telemetryInitialized = true;
		console.log("[Telemetry] Application Insights initialized");
		return true;
	} catch (err) {
		console.warn("[Telemetry] Failed to initialize App Insights:", err);
		return false;
	}
}

/**
 * Check if App Insights telemetry is active.
 */
export function isTelemetryEnabled(): boolean {
	return telemetryInitialized && appInsightsClient !== null;
}

/**
 * Shut down telemetry (flush pending data). For testing.
 */
export function shutdownTelemetry(): void {
	if (appInsightsClient) {
		appInsightsClient.flush();
	}
	appInsightsClient = null;
	telemetryInitialized = false;
}

// ─── In-memory Span Store ────────────────────────────────────

/** In-memory span store (kept for dashboard UI + SignalR streaming) */
const spanStore = new Map<string, TraceSpan[]>();

let spanCounter = 0;

function generateId(): string {
	spanCounter++;
	return `span-${Date.now()}-${spanCounter}`;
}

function generateTraceId(): string {
	spanCounter++;
	return `trace-${Date.now()}-${spanCounter}`;
}

/**
 * Start a new trace for a run execution.
 */
export function startRunTrace(runId: string): TraceSpan {
	const traceId = generateTraceId();
	const span: TraceSpan = {
		spanId: generateId(),
		traceId,
		parentSpanId: null,
		operationName: "run.execute",
		startTime: new Date().toISOString(),
		endTime: null,
		durationMs: null,
		status: SpanStatus.Ok,
		attributes: { "run.id": runId },
		events: [],
	};

	if (!spanStore.has(runId)) {
		spanStore.set(runId, []);
	}
	spanStore.get(runId)?.push(span);
	return span;
}

/**
 * Start a child span for agent execution within a run.
 */
export function startAgentSpan(
	runId: string,
	parentSpan: TraceSpan,
	agentId: string,
	role: string,
	taskId: string,
	decision: RoutingDecision,
): TraceSpan {
	const span: TraceSpan = {
		spanId: generateId(),
		traceId: parentSpan.traceId,
		parentSpanId: parentSpan.spanId,
		operationName: `agent.${role.toLowerCase()}.execute`,
		startTime: new Date().toISOString(),
		endTime: null,
		durationMs: null,
		status: SpanStatus.Ok,
		attributes: {
			"agent.role": role,
			"agent.id": agentId,
			"agent.model": decision.model,
			"task.id": taskId,
			"run.id": runId,
			"routing.tier": decision.tier,
			"routing.sigma": decision.sigma,
			"routing.provider": decision.provider,
		},
		events: [],
	};

	if (!spanStore.has(runId)) {
		spanStore.set(runId, []);
	}
	spanStore.get(runId)?.push(span);
	return span;
}

/**
 * Add an event to a span (e.g., "model.request", "model.response").
 */
export function addSpanEvent(
	span: TraceSpan,
	name: string,
	attributes: Record<string, string | number | boolean> = {},
): void {
	span.events.push({
		name,
		timestamp: new Date().toISOString(),
		attributes,
	});
}

/**
 * End a span with optional token/cost metrics.
 * Automatically exports to App Insights if enabled.
 */
export function endSpan(
	span: TraceSpan,
	status: SpanStatus = SpanStatus.Ok,
	metrics?: { inputTokens?: number; outputTokens?: number; cost?: number },
): void {
	span.endTime = new Date().toISOString();
	span.durationMs = new Date(span.endTime).getTime() - new Date(span.startTime).getTime();
	span.status = status;

	if (metrics) {
		if (metrics.inputTokens !== undefined) {
			span.attributes["tokens.input"] = metrics.inputTokens;
		}
		if (metrics.outputTokens !== undefined) {
			span.attributes["tokens.output"] = metrics.outputTokens;
		}
		if (metrics.cost !== undefined) {
			span.attributes["cost.usd"] = metrics.cost;
		}
	}

	// Export to App Insights (fire-and-forget)
	exportSpanToAppInsights(span);
}

/**
 * Get all spans for a run.
 */
export function getRunSpans(runId: string): ReadonlyArray<TraceSpan> {
	return spanStore.get(runId) ?? [];
}

/**
 * Get spans as a tree structure for UI rendering.
 */
export function getSpanTree(runId: string): SpanTreeNode[] {
	const spans = spanStore.get(runId) ?? [];
	const roots: SpanTreeNode[] = [];
	const childMap = new Map<string, SpanTreeNode[]>();

	// Build nodes
	for (const span of spans) {
		const node: SpanTreeNode = { span, children: [] };
		if (span.parentSpanId === null) {
			roots.push(node);
		} else {
			if (!childMap.has(span.parentSpanId)) {
				childMap.set(span.parentSpanId, []);
			}
			childMap.get(span.parentSpanId)?.push(node);
		}
	}

	// Link children
	function linkChildren(node: SpanTreeNode): void {
		node.children = childMap.get(node.span.spanId) ?? [];
		for (const child of node.children) {
			linkChildren(child);
		}
	}

	for (const root of roots) {
		linkChildren(root);
	}

	return roots;
}

/** Tree node for hierarchical span display */
export interface SpanTreeNode {
	span: TraceSpan;
	children: SpanTreeNode[];
}

/**
 * Clear all spans (for testing).
 */
export function clearSpanStore(): void {
	spanStore.clear();
	spanCounter = 0;
}

/**
 * Get total span count for a run.
 */
export function getSpanCount(runId: string): number {
	return (spanStore.get(runId) ?? []).length;
}

// ─── App Insights Export ─────────────────────────────────────

/**
 * Export a completed span to App Insights as a dependency telemetry item.
 * No-op if App Insights is not initialized.
 */
function exportSpanToAppInsights(span: TraceSpan): void {
	if (!appInsightsClient) return;

	const properties: Record<string, string> = {};
	const measurements: Record<string, number> = {};

	for (const [key, value] of Object.entries(span.attributes)) {
		if (typeof value === "number") {
			measurements[key] = value;
		} else {
			properties[key] = String(value);
		}
	}

	// Add span metadata
	properties.spanId = span.spanId;
	properties.traceId = span.traceId;
	if (span.parentSpanId) {
		properties.parentSpanId = span.parentSpanId;
	}

	// Agent spans → dependency telemetry (shows in App Map)
	if (span.operationName.startsWith("agent.")) {
		appInsightsClient.trackDependency({
			name: span.operationName,
			dependencyTypeName: "BlueflameAgent",
			duration: span.durationMs ?? 0,
			resultCode: span.status === SpanStatus.Ok ? "200" : "500",
			success: span.status === SpanStatus.Ok,
			data: span.attributes["agent.model"] as string | undefined,
			properties,
			measurements,
		});
	} else {
		// Run-level spans → custom events
		appInsightsClient.trackEvent({
			name: span.operationName,
			properties,
			measurements,
		});
	}
}
