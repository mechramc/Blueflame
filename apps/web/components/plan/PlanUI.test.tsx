import type { PlanTask } from "@blueflame/shared";
import { AgentRole, TaskStatus, UserRole } from "@blueflame/shared";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthorizeButton } from "./AuthorizeButton.js";
import { AuthorizeModal } from "./AuthorizeModal.js";
import { BudgetInput } from "./BudgetInput.js";
import { TaskDAG } from "./TaskDAG.js";
import { TaskTable } from "./TaskTable.js";

afterEach(() => {
	cleanup();
});

const SAMPLE_TASKS: PlanTask[] = [
	{
		id: "TASK-001",
		description: "Set up project structure",
		acceptanceCriteriaIds: ["AC-001"],
		dependencies: [],
		agentRole: AgentRole.Builder,
		estimatedTokens: 5000,
		estimatedCost: 0.05,
		sigmaEstimate: 0.2,
		parallelizable: true,
		status: TaskStatus.Pending,
	},
	{
		id: "TASK-002",
		description: "Implement core logic",
		acceptanceCriteriaIds: ["AC-002"],
		dependencies: ["TASK-001"],
		agentRole: AgentRole.Builder,
		estimatedTokens: 15000,
		estimatedCost: 0.15,
		sigmaEstimate: 0.5,
		parallelizable: false,
		status: TaskStatus.Pending,
	},
	{
		id: "TASK-003",
		description: "Run integration tests",
		acceptanceCriteriaIds: ["AC-001", "AC-002"],
		dependencies: ["TASK-002"],
		agentRole: AgentRole.Verifier,
		estimatedTokens: 3000,
		estimatedCost: 0.03,
		sigmaEstimate: 0.1,
		parallelizable: false,
		status: TaskStatus.Completed,
	},
];

describe("TaskTable", () => {
	it("should render all task rows", () => {
		render(<TaskTable tasks={SAMPLE_TASKS} />);
		expect(screen.getByTestId("task-row-TASK-001")).toBeDefined();
		expect(screen.getByTestId("task-row-TASK-002")).toBeDefined();
		expect(screen.getByTestId("task-row-TASK-003")).toBeDefined();
	});

	it("should display task IDs, descriptions, and roles", () => {
		render(<TaskTable tasks={SAMPLE_TASKS} />);
		expect(screen.getAllByText("TASK-001").length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("Set up project structure")).toBeDefined();
		expect(screen.getAllByText("BUILDER")).toHaveLength(2);
		expect(screen.getByText("VERIFIER")).toBeDefined();
	});

	it("should show estimated cost with dollar sign", () => {
		render(<TaskTable tasks={SAMPLE_TASKS} />);
		expect(screen.getByText("$0.05")).toBeDefined();
		expect(screen.getByText("$0.15")).toBeDefined();
	});

	it("should show dash for tasks with no dependencies", () => {
		render(<TaskTable tasks={SAMPLE_TASKS} />);
		const firstRow = screen.getByTestId("task-row-TASK-001");
		expect(firstRow.textContent).toContain("—");
	});
});

describe("TaskDAG", () => {
	it("should render the DAG container", () => {
		render(<TaskDAG tasks={SAMPLE_TASKS} />);
		expect(screen.getByTestId("task-dag")).toBeDefined();
	});

	it("should render nodes for each task", () => {
		render(<TaskDAG tasks={SAMPLE_TASKS} />);
		expect(screen.getByTestId("dag-node-TASK-001")).toBeDefined();
		expect(screen.getByTestId("dag-node-TASK-002")).toBeDefined();
		expect(screen.getByTestId("dag-node-TASK-003")).toBeDefined();
	});

	it("should display task IDs in nodes", () => {
		render(<TaskDAG tasks={SAMPLE_TASKS} />);
		expect(screen.getByText("TASK-001")).toBeDefined();
	});
});

describe("BudgetInput", () => {
	it("should render with default budget (120% of estimate)", () => {
		const onBudgetSet = vi.fn();
		render(<BudgetInput estimatedCost={1.0} onBudgetSet={onBudgetSet} />);
		const input = screen.getByLabelText("Budget Ceiling (USD):") as HTMLInputElement;
		expect(input.value).toBe("1.2");
	});

	it("should call onBudgetSet when Set Budget clicked", () => {
		const onBudgetSet = vi.fn();
		render(<BudgetInput estimatedCost={1.0} onBudgetSet={onBudgetSet} />);
		fireEvent.click(screen.getByText("Set Budget"));
		expect(onBudgetSet).toHaveBeenCalledWith(1.2);
	});

	it("should display estimated cost text", () => {
		render(<BudgetInput estimatedCost={2.5} onBudgetSet={vi.fn()} />);
		expect(screen.getByText("Estimated: $2.50")).toBeDefined();
	});

	it("should be disableable", () => {
		render(<BudgetInput estimatedCost={1.0} onBudgetSet={vi.fn()} disabled />);
		const input = screen.getByLabelText("Budget Ceiling (USD):") as HTMLInputElement;
		expect(input.disabled).toBe(true);
	});
});

describe("AuthorizeButton", () => {
	it("should be enabled for Authorizer role", () => {
		render(
			<AuthorizeButton
				userRoles={[UserRole.Authorizer]}
				budget={5}
				taskCount={3}
				onAuthorize={vi.fn()}
			/>,
		);
		const btn = screen.getByText("Authorize Execution");
		expect((btn as HTMLButtonElement).disabled).toBe(false);
	});

	it("should be enabled for Admin role", () => {
		render(
			<AuthorizeButton
				userRoles={[UserRole.Admin]}
				budget={5}
				taskCount={3}
				onAuthorize={vi.fn()}
			/>,
		);
		const btn = screen.getByText("Authorize Execution");
		expect((btn as HTMLButtonElement).disabled).toBe(false);
	});

	it("should be disabled for Editor role", () => {
		render(
			<AuthorizeButton
				userRoles={[UserRole.Editor]}
				budget={5}
				taskCount={3}
				onAuthorize={vi.fn()}
			/>,
		);
		const btn = screen.getByText("Authorize Execution");
		expect((btn as HTMLButtonElement).disabled).toBe(true);
	});

	it("should show role requirement message for insufficient role", () => {
		render(
			<AuthorizeButton
				userRoles={[UserRole.Viewer]}
				budget={5}
				taskCount={3}
				onAuthorize={vi.fn()}
			/>,
		);
		expect(screen.getByText(/Requires Blueflame_Authorizer/)).toBeDefined();
	});

	it("should open confirmation modal on click", () => {
		render(
			<AuthorizeButton
				userRoles={[UserRole.Authorizer]}
				budget={5}
				taskCount={3}
				onAuthorize={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByText("Authorize Execution"));
		expect(screen.getByTestId("authorize-modal")).toBeDefined();
	});
});

describe("AuthorizeModal", () => {
	it("should display budget and task count", () => {
		render(<AuthorizeModal budget={5.5} taskCount={7} onConfirm={vi.fn()} onCancel={vi.fn()} />);
		expect(screen.getByText("$5.50")).toBeDefined();
		expect(screen.getByText("7")).toBeDefined();
	});

	it("should call onConfirm when Authorize clicked", () => {
		const onConfirm = vi.fn();
		render(<AuthorizeModal budget={5} taskCount={3} onConfirm={onConfirm} onCancel={vi.fn()} />);
		fireEvent.click(screen.getByText("Authorize"));
		expect(onConfirm).toHaveBeenCalled();
	});

	it("should call onCancel when Cancel clicked", () => {
		const onCancel = vi.fn();
		render(<AuthorizeModal budget={5} taskCount={3} onConfirm={vi.fn()} onCancel={onCancel} />);
		fireEvent.click(screen.getByText("Cancel"));
		expect(onCancel).toHaveBeenCalled();
	});
});
