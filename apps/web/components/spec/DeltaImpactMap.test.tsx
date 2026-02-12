import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
	cleanup();
});

import type { DeltaSummary, TaskImpactDisplay } from "./DeltaImpactMap";
import { DeltaImpactMap } from "./DeltaImpactMap";

const mockImpacts: TaskImpactDisplay[] = [
	{ taskId: "TASK-001", impact: "PRESERVE", reason: "No changes affect this task", changeCount: 0 },
	{ taskId: "TASK-002", impact: "REBUILD", reason: "Criteria AC-001 modified", changeCount: 2 },
	{ taskId: "NEW-AC-003", impact: "NEW", reason: "New criterion AC-003 added", changeCount: 1 },
	{ taskId: "TASK-003", impact: "REMOVE", reason: "All criteria removed", changeCount: 1 },
];

const mockSummary: DeltaSummary = {
	preserve: 1,
	rebuild: 1,
	new: 1,
	remove: 1,
	totalChanges: 4,
};

describe("DeltaImpactMap", () => {
	it("should render impact map with task entries", () => {
		render(
			<DeltaImpactMap
				oldSpecId="spec-v1"
				newSpecId="spec-v2"
				taskImpacts={mockImpacts}
				summary={mockSummary}
			/>,
		);
		expect(screen.getByTestId("delta-impact-map")).toBeTruthy();
		expect(screen.getByTestId("impact-task-TASK-001")).toBeTruthy();
		expect(screen.getByTestId("impact-task-TASK-002")).toBeTruthy();
		expect(screen.getByTestId("impact-task-NEW-AC-003")).toBeTruthy();
		expect(screen.getByTestId("impact-task-TASK-003")).toBeTruthy();
	});

	it("should render summary badges", () => {
		render(
			<DeltaImpactMap
				oldSpecId="spec-v1"
				newSpecId="spec-v2"
				taskImpacts={mockImpacts}
				summary={mockSummary}
			/>,
		);
		const summary = screen.getByTestId("delta-summary");
		expect(summary).toBeTruthy();
		expect(summary.textContent).toContain("Preserve");
		expect(summary.textContent).toContain("Rebuild");
	});

	it("should show re-authorize button when changes exist", () => {
		const onReauthorize = vi.fn();
		render(
			<DeltaImpactMap
				oldSpecId="spec-v1"
				newSpecId="spec-v2"
				taskImpacts={mockImpacts}
				summary={mockSummary}
				onReauthorize={onReauthorize}
			/>,
		);
		expect(screen.getByTestId("reauthorize-btn")).toBeTruthy();
	});

	it("should not show re-authorize when only preserves", () => {
		render(
			<DeltaImpactMap
				oldSpecId="spec-v1"
				newSpecId="spec-v2"
				taskImpacts={[mockImpacts[0] as TaskImpactDisplay]}
				summary={{ preserve: 1, rebuild: 0, new: 0, remove: 0, totalChanges: 0 }}
				onReauthorize={() => {}}
			/>,
		);
		expect(screen.queryByTestId("reauthorize-btn")).toBeNull();
	});

	it("should render empty state when no changes", () => {
		render(
			<DeltaImpactMap
				oldSpecId="spec-v1"
				newSpecId="spec-v2"
				taskImpacts={[]}
				summary={{ preserve: 0, rebuild: 0, new: 0, remove: 0, totalChanges: 0 }}
			/>,
		);
		expect(screen.getByText("No changes detected between spec versions")).toBeTruthy();
	});
});
