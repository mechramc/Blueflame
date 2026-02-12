"use client";

import { useState } from "react";

/**
 * Reasoning Trace Viewer — expandable trace timeline showing per-agent spans.
 *
 * Renders a hierarchical tree of OpenTelemetry-style spans with duration,
 * model, token counts, and cost information.
 *
 * Source: Blueflame-Spec-v3-ACAR.md Section 13 (Enterprise Governance)
 */

/** Span data from the telemetry API */
export interface TraceSpanData {
	spanId: string;
	parentSpanId: string | null;
	operationName: string;
	startTime: string;
	endTime: string | null;
	durationMs: number | null;
	status: "OK" | "ERROR";
	attributes: Record<string, string | number | boolean>;
	events: Array<{
		name: string;
		timestamp: string;
		attributes: Record<string, string | number | boolean>;
	}>;
}

/** Tree node for rendering */
interface SpanNode {
	span: TraceSpanData;
	children: SpanNode[];
}

interface TraceViewerProps {
	spans: TraceSpanData[];
	runId: string;
}

const ROLE_COLORS: Record<string, string> = {
	builder: "border-l-purple-500",
	verifier: "border-l-teal-500",
	explainer: "border-l-orange-500",
	planner: "border-l-blue-500",
	fixer: "border-l-red-500",
};

function buildTree(spans: TraceSpanData[]): SpanNode[] {
	const roots: SpanNode[] = [];
	const childMap = new Map<string, SpanNode[]>();

	for (const span of spans) {
		const node: SpanNode = { span, children: [] };
		if (span.parentSpanId === null) {
			roots.push(node);
		} else {
			if (!childMap.has(span.parentSpanId)) {
				childMap.set(span.parentSpanId, []);
			}
			childMap.get(span.parentSpanId)?.push(node);
		}
	}

	function link(node: SpanNode): void {
		node.children = childMap.get(node.span.spanId) ?? [];
		for (const child of node.children) {
			link(child);
		}
	}

	for (const root of roots) {
		link(root);
	}

	return roots;
}

function formatDuration(ms: number | null): string {
	if (ms === null) return "...";
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

function SpanRow({ node, depth }: { node: SpanNode; depth: number }) {
	const [expanded, setExpanded] = useState(depth < 2);
	const { span } = node;
	const hasChildren = node.children.length > 0;

	const role = String(span.attributes["agent.role"] ?? "").toLowerCase();
	const model = String(span.attributes["agent.model"] ?? "");
	const tokens =
		Number(span.attributes["tokens.input"] ?? 0) + Number(span.attributes["tokens.output"] ?? 0);
	const cost = Number(span.attributes["cost.usd"] ?? 0);
	const borderColor = ROLE_COLORS[role] ?? "border-l-[--border]";

	return (
		<>
			<div
				className={`flex items-center gap-2 py-1.5 px-3 border-l-2 ${borderColor} hover:bg-[--bg-secondary]/50 transition-colors`}
				style={{ paddingLeft: `${depth * 20 + 12}px` }}
				data-testid={`trace-span-${span.spanId}`}
			>
				{hasChildren ? (
					<button
						type="button"
						onClick={() => setExpanded(!expanded)}
						className="w-4 h-4 text-[--text-muted] hover:text-[--text-primary] text-xs"
					>
						{expanded ? "\u25BC" : "\u25B6"}
					</button>
				) : (
					<span className="w-4" />
				)}

				<span
					className={`text-xs font-mono ${span.status === "ERROR" ? "text-red-400" : "text-[--text-primary]"}`}
				>
					{span.operationName}
				</span>

				<span className="flex-1" />

				{model && <span className="text-[10px] text-[--text-muted] font-mono">{model}</span>}

				{tokens > 0 && (
					<span className="text-[10px] text-[--text-muted] font-mono">
						{tokens.toLocaleString()} tok
					</span>
				)}

				{cost > 0 && (
					<span className="text-[10px] text-emerald-400 font-mono">${cost.toFixed(4)}</span>
				)}

				<span
					className={`text-[10px] font-mono min-w-[50px] text-right ${
						span.status === "ERROR" ? "text-red-400" : "text-[--text-secondary]"
					}`}
				>
					{formatDuration(span.durationMs)}
				</span>
			</div>

			{expanded &&
				node.children.map((child) => (
					<SpanRow key={child.span.spanId} node={child} depth={depth + 1} />
				))}
		</>
	);
}

export function TraceViewer({ spans, runId }: TraceViewerProps) {
	const tree = buildTree(spans);
	const totalSpans = spans.length;
	const errorSpans = spans.filter((s) => s.status === "ERROR").length;

	return (
		<div className="rounded border border-[--border] bg-[--bg-primary]" data-testid="trace-viewer">
			<div className="flex items-center justify-between px-4 py-2 border-b border-[--border] bg-[--bg-secondary]">
				<div className="flex items-center gap-2">
					<h3 className="text-sm font-semibold text-[--text-primary]">Reasoning Trace</h3>
					<span className="text-xs text-[--text-muted]">Run: {runId}</span>
				</div>
				<div className="flex items-center gap-3 text-xs text-[--text-secondary]">
					<span>{totalSpans} spans</span>
					{errorSpans > 0 && <span className="text-red-400">{errorSpans} errors</span>}
				</div>
			</div>

			<div className="divide-y divide-[--border]/30">
				{tree.length === 0 ? (
					<div className="px-4 py-8 text-center text-sm text-[--text-muted]">
						No trace data available
					</div>
				) : (
					tree.map((root) => <SpanRow key={root.span.spanId} node={root} depth={0} />)
				)}
			</div>
		</div>
	);
}
