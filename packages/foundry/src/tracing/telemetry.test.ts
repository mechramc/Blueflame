import { afterEach, describe, expect, it } from "vitest";

import type { RoutingDecision } from "../routing/types.js";
import { ExecutionTier, ProviderType } from "../routing/types.js";

import {
	SpanStatus,
	addSpanEvent,
	clearSpanStore,
	endSpan,
	getRunSpans,
	getSpanCount,
	getSpanTree,
	initTelemetry,
	isTelemetryEnabled,
	shutdownTelemetry,
	startAgentSpan,
	startRunTrace,
} from "./telemetry.js";

afterEach(() => {
	clearSpanStore();
	shutdownTelemetry();
});

const mockDecision: RoutingDecision = {
	role: "BUILDER",
	sigma: 0.5,
	tier: ExecutionTier.Standard,
	provider: ProviderType.AzureOpenAI,
	model: "gpt-4o",
	reason: "σ=0.50 → Standard tier",
};

describe("startRunTrace", () => {
	it("should create a root span for a run", () => {
		const span = startRunTrace("run-1");
		expect(span.traceId).toBeTruthy();
		expect(span.parentSpanId).toBeNull();
		expect(span.operationName).toBe("run.execute");
		expect(span.attributes["run.id"]).toBe("run-1");
	});
});

describe("startAgentSpan", () => {
	it("should create a child span linked to parent", () => {
		const parent = startRunTrace("run-1");
		const child = startAgentSpan("run-1", parent, "agent-1", "BUILDER", "TASK-001", mockDecision);

		expect(child.parentSpanId).toBe(parent.spanId);
		expect(child.traceId).toBe(parent.traceId);
		expect(child.operationName).toBe("agent.builder.execute");
		expect(child.attributes["agent.role"]).toBe("BUILDER");
		expect(child.attributes["agent.model"]).toBe("gpt-4o");
		expect(child.attributes["routing.sigma"]).toBe(0.5);
	});
});

describe("addSpanEvent", () => {
	it("should add events to a span", () => {
		const span = startRunTrace("run-1");
		addSpanEvent(span, "model.request", { prompt_tokens: 100 });
		addSpanEvent(span, "model.response", { completion_tokens: 50 });

		expect(span.events).toHaveLength(2);
		expect(span.events[0]?.name).toBe("model.request");
		expect(span.events[1]?.name).toBe("model.response");
	});
});

describe("endSpan", () => {
	it("should set endTime and duration", () => {
		const span = startRunTrace("run-1");
		endSpan(span, SpanStatus.Ok, { inputTokens: 100, outputTokens: 50, cost: 0.005 });

		expect(span.endTime).toBeTruthy();
		expect(span.durationMs).toBeGreaterThanOrEqual(0);
		expect(span.status).toBe(SpanStatus.Ok);
		expect(span.attributes["tokens.input"]).toBe(100);
		expect(span.attributes["tokens.output"]).toBe(50);
		expect(span.attributes["cost.usd"]).toBe(0.005);
	});

	it("should mark error status", () => {
		const span = startRunTrace("run-1");
		endSpan(span, SpanStatus.Error);

		expect(span.status).toBe(SpanStatus.Error);
	});
});

describe("getRunSpans", () => {
	it("should return all spans for a run", () => {
		const parent = startRunTrace("run-1");
		startAgentSpan("run-1", parent, "agent-1", "BUILDER", "TASK-001", mockDecision);
		startAgentSpan("run-1", parent, "agent-2", "VERIFIER", "TASK-001", mockDecision);

		expect(getRunSpans("run-1")).toHaveLength(3);
	});

	it("should return empty for unknown run", () => {
		expect(getRunSpans("unknown")).toHaveLength(0);
	});
});

describe("getSpanTree", () => {
	it("should build hierarchical tree from flat spans", () => {
		const parent = startRunTrace("run-1");
		startAgentSpan("run-1", parent, "agent-1", "BUILDER", "TASK-001", mockDecision);
		startAgentSpan("run-1", parent, "agent-2", "VERIFIER", "TASK-001", mockDecision);

		const tree = getSpanTree("run-1");
		expect(tree).toHaveLength(1); // one root
		expect(tree[0]?.children).toHaveLength(2); // two agent children
	});
});

describe("getSpanCount", () => {
	it("should count spans for a run", () => {
		const parent = startRunTrace("run-1");
		startAgentSpan("run-1", parent, "agent-1", "BUILDER", "TASK-001", mockDecision);

		expect(getSpanCount("run-1")).toBe(2);
	});

	it("should return 0 for unknown run", () => {
		expect(getSpanCount("unknown")).toBe(0);
	});
});

describe("initTelemetry", () => {
	it("should return false when no connection string is provided", () => {
		const result = initTelemetry();
		expect(result).toBe(false);
		expect(isTelemetryEnabled()).toBe(false);
	});

	it("should return false for empty connection string", () => {
		const result = initTelemetry("");
		expect(result).toBe(false);
		expect(isTelemetryEnabled()).toBe(false);
	});
});

describe("shutdownTelemetry", () => {
	it("should reset telemetry state", () => {
		shutdownTelemetry();
		expect(isTelemetryEnabled()).toBe(false);
	});
});

describe("endSpan with App Insights disabled", () => {
	it("should not throw when App Insights is not initialized", () => {
		const parent = startRunTrace("run-1");
		const child = startAgentSpan("run-1", parent, "agent-1", "BUILDER", "TASK-001", mockDecision);

		// endSpan should silently skip App Insights export
		expect(() => endSpan(parent, SpanStatus.Ok)).not.toThrow();
		expect(() => endSpan(child, SpanStatus.Ok, { inputTokens: 100, outputTokens: 50, cost: 0.01 })).not.toThrow();
	});
});
