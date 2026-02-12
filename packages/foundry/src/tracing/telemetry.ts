/**
 * OpenTelemetry tracing instrumentation for Blueflame agents.
 *
 * Provides span tracking for orchestrator operations, agent execution,
 * and model routing decisions. Exports to Azure Monitor / App Insights.
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

/** In-memory span store for MVP (replace with Azure Monitor exporter in prod) */
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
