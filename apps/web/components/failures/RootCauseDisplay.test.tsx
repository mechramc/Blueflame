import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RootCauseDisplay } from "./RootCauseDisplay";
import type { RootCauseAnalysis } from "@blueflame/shared";

const mockRootCause: RootCauseAnalysis = {
	summary: "TypeScript compilation error in auth module",
	rootCause: "Missing null check on session token in login handler",
	confidence: 0.85,
	affectedFiles: ["src/auth/login.ts", "src/auth/login.test.ts"],
	remediationTasks: [
		{
			id: "REM-001",
			description: "Add null check for session token",
			estimatedSigma: 2,
			estimatedCost: 0.15,
			agentRole: "BUILDER",
		},
	],
};

describe("RootCauseDisplay", () => {
	afterEach(() => {
		cleanup();
	});
	it("should show empty state when rootCause is null", () => {
		render(<RootCauseDisplay rootCause={null} />);
		expect(screen.getByTestId("no-root-cause")).toBeInTheDocument();
	});

	it("should display summary", () => {
		render(<RootCauseDisplay rootCause={mockRootCause} />);
		expect(screen.getByTestId("rca-summary")).toHaveTextContent(
			"TypeScript compilation error in auth module",
		);
	});

	it("should display confidence with label", () => {
		render(<RootCauseDisplay rootCause={mockRootCause} />);
		expect(screen.getByTestId("rca-confidence")).toHaveTextContent("85%");
		expect(screen.getByTestId("rca-confidence")).toHaveTextContent("Medium");
	});

	it("should display root cause detail", () => {
		render(<RootCauseDisplay rootCause={mockRootCause} />);
		expect(screen.getByTestId("rca-detail")).toHaveTextContent(
			"Missing null check on session token",
		);
	});

	it("should display affected files", () => {
		render(<RootCauseDisplay rootCause={mockRootCause} />);
		expect(screen.getByTestId("affected-files")).toBeInTheDocument();
		expect(screen.getByText("src/auth/login.ts")).toBeInTheDocument();
		expect(screen.getByText("src/auth/login.test.ts")).toBeInTheDocument();
	});

	it("should display remediation tasks", () => {
		render(<RootCauseDisplay rootCause={mockRootCause} />);
		expect(screen.getByTestId("remediation-tasks")).toBeInTheDocument();
		expect(screen.getByText("Add null check for session token")).toBeInTheDocument();
		expect(screen.getByText("REM-001")).toBeInTheDocument();
	});

	it("should show High confidence for >= 0.9", () => {
		render(
			<RootCauseDisplay
				rootCause={{ ...mockRootCause, confidence: 0.95 }}
			/>,
		);
		expect(screen.getByTestId("rca-confidence")).toHaveTextContent("High");
	});

	it("should show Low confidence for 0.5-0.69", () => {
		render(
			<RootCauseDisplay
				rootCause={{ ...mockRootCause, confidence: 0.55 }}
			/>,
		);
		expect(screen.getByTestId("rca-confidence")).toHaveTextContent("Low");
	});
});
