import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RemediationPlanView, type RemediationViewData } from "./RemediationPlanView";

const mockRemediation: RemediationViewData = {
	remediationId: "REM-FAIL-1-123",
	status: "PLAN_READY",
	failureId: "FAIL-1",
	parentLockId: "lock-run-1",
	remediationLockId: null,
	createdAt: "2026-02-11T12:00:00Z",
	updatedAt: "2026-02-11T12:05:00Z",
};

describe("RemediationPlanView", () => {
	afterEach(() => {
		cleanup();
	});
	it("should show empty state when no remediation", () => {
		render(<RemediationPlanView remediation={null} />);
		expect(screen.getByTestId("no-remediation")).toBeInTheDocument();
	});

	it("should display remediation details", () => {
		render(<RemediationPlanView remediation={mockRemediation} />);
		expect(screen.getByTestId("remediation-view")).toBeInTheDocument();
		expect(screen.getByText("REM-FAIL-1-123")).toBeInTheDocument();
		expect(screen.getByText("lock-run-1")).toBeInTheDocument();
	});

	it("should show status badge", () => {
		render(<RemediationPlanView remediation={mockRemediation} />);
		expect(screen.getByTestId("remediation-status")).toHaveTextContent("Plan Ready");
	});

	it("should show authorize button in PLAN_READY state", () => {
		const onAuthorize = vi.fn();
		render(<RemediationPlanView remediation={mockRemediation} onAuthorize={onAuthorize} />);
		const btn = screen.getByTestId("authorize-remediation-btn");
		expect(btn).toBeInTheDocument();
		fireEvent.click(btn);
		expect(onAuthorize).toHaveBeenCalledOnce();
	});

	it("should not show authorize button when not PLAN_READY", () => {
		render(
			<RemediationPlanView
				remediation={{ ...mockRemediation, status: "EXECUTING" }}
				onAuthorize={vi.fn()}
			/>,
		);
		expect(screen.queryByTestId("authorize-remediation-btn")).not.toBeInTheDocument();
	});

	it("should show remediation lock when available", () => {
		render(
			<RemediationPlanView
				remediation={{
					...mockRemediation,
					status: "AUTHORIZED",
					remediationLockId: "lock-rem-1",
				}}
			/>,
		);
		expect(screen.getByText("lock-rem-1")).toBeInTheDocument();
	});

	it("should show Completed status style", () => {
		render(<RemediationPlanView remediation={{ ...mockRemediation, status: "COMPLETED" }} />);
		expect(screen.getByTestId("remediation-status")).toHaveTextContent("Completed");
	});
});
