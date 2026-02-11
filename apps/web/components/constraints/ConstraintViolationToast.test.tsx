import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type ConstraintViolation, ConstraintViolationToast } from "./ConstraintViolationToast";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

const mockViolation: ConstraintViolation = {
	id: "v-1",
	constraintId: "C-LINT-01",
	message: "Linting constraint violated: no console.log in production code",
	severity: "error",
	agentId: "agent-builder-1",
};

const mockWarning: ConstraintViolation = {
	id: "v-2",
	constraintId: "C-COST-01",
	message: "Cost approaching threshold",
	severity: "warning",
};

describe("ConstraintViolationToast", () => {
	it("should render when violation is provided", () => {
		render(<ConstraintViolationToast violation={mockViolation} onDismiss={() => {}} />);
		expect(screen.getByTestId("constraint-violation-toast")).toBeTruthy();
		expect(screen.getByText("Constraint Violation")).toBeTruthy();
		expect(screen.getByText(mockViolation.message)).toBeTruthy();
	});

	it("should not render when violation is null", () => {
		const { container } = render(
			<ConstraintViolationToast violation={null} onDismiss={() => {}} />,
		);
		expect(container.innerHTML).toBe("");
	});

	it("should show agent ID when provided", () => {
		render(<ConstraintViolationToast violation={mockViolation} onDismiss={() => {}} />);
		expect(screen.getByText("Agent: agent-builder-1")).toBeTruthy();
	});

	it("should not show agent ID when not provided", () => {
		render(<ConstraintViolationToast violation={mockWarning} onDismiss={() => {}} />);
		expect(screen.queryByText(/Agent:/)).toBeNull();
	});

	it("should call onDismiss when dismiss button is clicked", () => {
		const onDismiss = vi.fn();
		render(<ConstraintViolationToast violation={mockViolation} onDismiss={onDismiss} />);
		fireEvent.click(screen.getByTestId("toast-dismiss"));
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("should auto-dismiss after specified time", () => {
		const onDismiss = vi.fn();
		render(
			<ConstraintViolationToast
				violation={mockViolation}
				onDismiss={onDismiss}
				autoDismissMs={3000}
			/>,
		);
		expect(onDismiss).not.toHaveBeenCalled();
		act(() => {
			vi.advanceTimersByTime(3000);
		});
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("should use yellow styling for warning severity", () => {
		const { container } = render(
			<ConstraintViolationToast violation={mockWarning} onDismiss={() => {}} />,
		);
		const inner = container.querySelector("[data-testid='constraint-violation-toast'] > div");
		expect(inner?.className).toContain("border-yellow-400");
		expect(inner?.className).toContain("bg-yellow-50");
	});
});
