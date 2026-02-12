import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TraceSpanData } from "./TraceViewer";
import { TraceViewer } from "./TraceViewer";

const mockSpans: TraceSpanData[] = [
	{
		spanId: "span-1",
		parentSpanId: null,
		operationName: "run.execute",
		startTime: "2026-02-12T10:00:00Z",
		endTime: "2026-02-12T10:01:00Z",
		durationMs: 60000,
		status: "OK",
		attributes: { "run.id": "run-1" },
		events: [],
	},
	{
		spanId: "span-2",
		parentSpanId: "span-1",
		operationName: "agent.builder.execute",
		startTime: "2026-02-12T10:00:05Z",
		endTime: "2026-02-12T10:00:45Z",
		durationMs: 40000,
		status: "OK",
		attributes: {
			"agent.role": "builder",
			"agent.model": "gpt-4o",
			"tokens.input": 500,
			"tokens.output": 200,
			"cost.usd": 0.005,
		},
		events: [],
	},
	{
		spanId: "span-3",
		parentSpanId: "span-1",
		operationName: "agent.verifier.execute",
		startTime: "2026-02-12T10:00:45Z",
		endTime: "2026-02-12T10:00:55Z",
		durationMs: 10000,
		status: "ERROR",
		attributes: {
			"agent.role": "verifier",
			"agent.model": "gpt-4o-mini",
			"tokens.input": 100,
			"tokens.output": 50,
			"cost.usd": 0.001,
		},
		events: [],
	},
];

describe("TraceViewer", () => {
	it("should render trace viewer with spans", () => {
		render(<TraceViewer spans={mockSpans} runId="run-1" />);
		expect(screen.getByTestId("trace-viewer")).toBeTruthy();
		expect(screen.getByText("3 spans")).toBeTruthy();
	});

	it("should show error count", () => {
		render(<TraceViewer spans={mockSpans} runId="run-1" />);
		const errorElements = screen.getAllByText("1 errors");
		expect(errorElements.length).toBeGreaterThanOrEqual(1);
	});

	it("should render empty state when no spans", () => {
		render(<TraceViewer spans={[]} runId="run-1" />);
		expect(screen.getByText("No trace data available")).toBeTruthy();
	});

	it("should display run ID", () => {
		render(<TraceViewer spans={mockSpans} runId="run-42" />);
		expect(screen.getByText("Run: run-42")).toBeTruthy();
	});
});
