import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FailureTimeline, type FailureTimelineEntry } from "./FailureTimeline";

const mockFailures: FailureTimelineEntry[] = [
	{
		failureId: "FAIL-1",
		failureType: "test",
		buildNumber: "42",
		source: "azure-devops",
		timestamp: "2026-02-11T12:00:00Z",
		branchRef: "refs/heads/feature/auth",
		hasRemediation: false,
	},
	{
		failureId: "FAIL-2",
		failureType: "build",
		buildNumber: "43",
		source: "azure-devops",
		timestamp: "2026-02-11T13:00:00Z",
		branchRef: "refs/heads/main",
		hasRemediation: true,
	},
];

describe("FailureTimeline", () => {
	afterEach(() => {
		cleanup();
	});
	it("should render empty state when no failures", () => {
		render(<FailureTimeline failures={[]} onSelect={vi.fn()} />);
		expect(screen.getByTestId("no-failures")).toBeInTheDocument();
	});

	it("should render failure entries", () => {
		render(<FailureTimeline failures={mockFailures} onSelect={vi.fn()} />);
		expect(screen.getByTestId("failure-timeline")).toBeInTheDocument();
		expect(screen.getByTestId("failure-entry-FAIL-1")).toBeInTheDocument();
		expect(screen.getByTestId("failure-entry-FAIL-2")).toBeInTheDocument();
	});

	it("should show build numbers", () => {
		render(<FailureTimeline failures={mockFailures} onSelect={vi.fn()} />);
		expect(screen.getByText("Build #42")).toBeInTheDocument();
		expect(screen.getByText("Build #43")).toBeInTheDocument();
	});

	it("should show remediation badge when remediated", () => {
		render(<FailureTimeline failures={mockFailures} onSelect={vi.fn()} />);
		expect(screen.getByTestId("remediation-badge")).toBeInTheDocument();
		expect(screen.getByText("Remediated")).toBeInTheDocument();
	});

	it("should call onSelect when clicked", () => {
		const onSelect = vi.fn();
		render(<FailureTimeline failures={mockFailures} onSelect={onSelect} />);
		fireEvent.click(screen.getByTestId("failure-entry-FAIL-1"));
		expect(onSelect).toHaveBeenCalledWith("FAIL-1");
	});

	it("should highlight selected entry", () => {
		render(<FailureTimeline failures={mockFailures} onSelect={vi.fn()} selectedId="FAIL-2" />);
		const selected = screen.getByTestId("failure-entry-FAIL-2");
		expect(selected.className).toContain("bg-blue-50");
	});

	it("should strip refs/heads/ from branch display", () => {
		render(<FailureTimeline failures={mockFailures} onSelect={vi.fn()} />);
		expect(screen.getByText("feature/auth")).toBeInTheDocument();
	});
});
