import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
	cleanup();
});

import { BudgetDecision } from "@blueflame/shared";

import { BudgetWarning } from "./BudgetWarning";
import { CostProgressBar } from "./CostProgressBar";
import { PauseDecisionModal } from "./PauseDecisionModal";

describe("CostProgressBar", () => {
	it("should render spend vs ceiling", () => {
		render(<CostProgressBar currentSpend={3.5} ceiling={10.0} />);
		expect(screen.getByText("$3.50 / $10.00")).toBeTruthy();
		expect(screen.getByText("35.0%")).toBeTruthy();
	});

	it("should show green color under 80%", () => {
		const { container } = render(<CostProgressBar currentSpend={5} ceiling={10} />);
		const bar = container.querySelector("[role='progressbar']");
		expect(bar?.className).toContain("bg-green-500");
	});

	it("should show yellow color at 80-95%", () => {
		const { container } = render(<CostProgressBar currentSpend={8.5} ceiling={10} />);
		const bar = container.querySelector("[role='progressbar']");
		expect(bar?.className).toContain("bg-yellow-500");
	});

	it("should show red color at 95%+", () => {
		const { container } = render(<CostProgressBar currentSpend={9.8} ceiling={10} />);
		const bar = container.querySelector("[role='progressbar']");
		expect(bar?.className).toContain("bg-red-500");
	});

	it("should cap at 100%", () => {
		render(<CostProgressBar currentSpend={15} ceiling={10} />);
		expect(screen.getByText("100.0%")).toBeTruthy();
	});

	it("should handle zero ceiling", () => {
		render(<CostProgressBar currentSpend={0} ceiling={0} />);
		expect(screen.getByText("0.0%")).toBeTruthy();
	});
});

describe("BudgetWarning", () => {
	it("should render nothing under 80%", () => {
		const { container } = render(<BudgetWarning currentSpend={5} ceiling={10} percentUsed={50} />);
		expect(container.querySelector("[role='alert']")).toBeNull();
	});

	it("should show warning at 80%", () => {
		render(<BudgetWarning currentSpend={8} ceiling={10} percentUsed={80} />);
		expect(screen.getByText("Budget Warning")).toBeTruthy();
	});

	it("should show critical at 95%", () => {
		render(<BudgetWarning currentSpend={9.5} ceiling={10} percentUsed={95} />);
		expect(screen.getByText(/Budget Critical/)).toBeTruthy();
	});

	it("should display spend details", () => {
		render(<BudgetWarning currentSpend={8.5} ceiling={10} percentUsed={85} />);
		expect(screen.getByText(/\$8\.50 of \$10\.00/)).toBeTruthy();
	});
});

describe("PauseDecisionModal", () => {
	it("should render modal with spend info", () => {
		const onDecision = vi.fn();
		render(<PauseDecisionModal currentSpend={9.5} ceiling={10} onDecision={onDecision} />);
		expect(screen.getByText("Budget Limit Reached")).toBeTruthy();
		expect(screen.getByText("$9.50")).toBeTruthy();
		expect(screen.getByText("$10.00")).toBeTruthy();
	});

	it("should call onDecision with Resume and top-up", () => {
		const onDecision = vi.fn();
		render(<PauseDecisionModal currentSpend={9.5} ceiling={10} onDecision={onDecision} />);
		fireEvent.click(screen.getByTestId("resume-button"));
		expect(onDecision).toHaveBeenCalledWith(BudgetDecision.Resume, 5); // 50% of ceiling
	});

	it("should call onDecision with Accept", () => {
		const onDecision = vi.fn();
		render(<PauseDecisionModal currentSpend={9.5} ceiling={10} onDecision={onDecision} />);
		fireEvent.click(screen.getByTestId("accept-button"));
		expect(onDecision).toHaveBeenCalledWith(BudgetDecision.Accept);
	});

	it("should call onDecision with Abandon", () => {
		const onDecision = vi.fn();
		render(<PauseDecisionModal currentSpend={9.5} ceiling={10} onDecision={onDecision} />);
		fireEvent.click(screen.getByTestId("abandon-button"));
		expect(onDecision).toHaveBeenCalledWith(BudgetDecision.Abandon);
	});

	it("should allow changing top-up amount", () => {
		const onDecision = vi.fn();
		render(<PauseDecisionModal currentSpend={9.5} ceiling={10} onDecision={onDecision} />);
		const input = screen.getByTestId("top-up-input") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "2.5" } });
		fireEvent.click(screen.getByTestId("resume-button"));
		expect(onDecision).toHaveBeenCalledWith(BudgetDecision.Resume, 2.5);
	});
});
