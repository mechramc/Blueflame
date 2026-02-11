import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AgentStatus, TaskStatus } from "@blueflame/shared";

import type { ActionEvent } from "./ActionStream";
import { ActionStream } from "./ActionStream";
import { AgentGrid } from "./AgentGrid";
import type { AgentCardData } from "./AgentStatusCard";
import { AgentStatusCard } from "./AgentStatusCard";
import { DAGProgress } from "./DAGProgress";
import { DashboardLayout } from "./DashboardLayout";

afterEach(() => {
	cleanup();
});

const mockAgent: AgentCardData = {
	agentId: "agent-1",
	role: "BUILDER",
	status: AgentStatus.Executing,
	taskId: "T-001",
	model: "gpt-4o",
	tokensUsed: 12500,
	costIncurred: 0.1875,
	sigmaValue: 0.15,
};

describe("AgentStatusCard", () => {
	it("should render agent role and status", () => {
		render(<AgentStatusCard agent={mockAgent} />);
		expect(screen.getByText("Builder")).toBeTruthy();
		expect(screen.getByText("EXECUTING")).toBeTruthy();
	});

	it("should show task ID", () => {
		render(<AgentStatusCard agent={mockAgent} />);
		expect(screen.getByText("T-001")).toBeTruthy();
	});

	it("should show model name", () => {
		render(<AgentStatusCard agent={mockAgent} />);
		expect(screen.getByText("gpt-4o")).toBeTruthy();
	});

	it("should show token count", () => {
		render(<AgentStatusCard agent={mockAgent} />);
		expect(screen.getByText("12,500")).toBeTruthy();
	});

	it("should show cost", () => {
		render(<AgentStatusCard agent={mockAgent} />);
		expect(screen.getByText("$0.1875")).toBeTruthy();
	});

	it("should use green styling for executing status", () => {
		const { container } = render(<AgentStatusCard agent={mockAgent} />);
		const card = container.firstElementChild;
		expect(card?.className).toContain("bg-green-50");
	});

	it("should use red styling for failed status", () => {
		const failedAgent = { ...mockAgent, status: AgentStatus.Failed };
		const { container } = render(<AgentStatusCard agent={failedAgent} />);
		const card = container.firstElementChild;
		expect(card?.className).toContain("bg-red-50");
	});

	it("should show dash for null taskId", () => {
		const idleAgent = { ...mockAgent, taskId: null };
		render(<AgentStatusCard agent={idleAgent} />);
		const dashes = screen.getAllByText("\u2014");
		expect(dashes.length).toBeGreaterThan(0);
	});

	it("should show blocked indicator when isBlocked is true", () => {
		const blockedAgent = { ...mockAgent, isBlocked: true };
		render(<AgentStatusCard agent={blockedAgent} />);
		expect(screen.getByTestId("blocked-indicator")).toBeTruthy();
	});

	it("should apply flash-red animation when blocked", () => {
		const blockedAgent = { ...mockAgent, isBlocked: true };
		const { container } = render(<AgentStatusCard agent={blockedAgent} />);
		const card = container.firstElementChild;
		expect(card?.className).toContain("animate-flash-red");
	});

	it("should show sigma bar", () => {
		render(<AgentStatusCard agent={mockAgent} />);
		expect(screen.getByTestId("sigma-bar")).toBeTruthy();
	});

	it("should apply escalate-pulse for high sigma agents", () => {
		const highSigmaAgent = { ...mockAgent, sigmaValue: 0.85 };
		const { container } = render(<AgentStatusCard agent={highSigmaAgent} />);
		const card = container.firstElementChild;
		expect(card?.className).toContain("animate-escalate-pulse");
	});

	it("should show verified badge for high sigma completed agents", () => {
		const completedHighSigma = { ...mockAgent, sigmaValue: 0.85, status: "COMPLETED" };
		render(<AgentStatusCard agent={completedHighSigma} />);
		expect(screen.getByTestId("verified-badge")).toBeTruthy();
	});
});

describe("AgentGrid", () => {
	it("should render grid with agents", () => {
		render(<AgentGrid agents={[mockAgent]} />);
		expect(screen.getByTestId("agent-grid")).toBeTruthy();
		expect(screen.getByTestId("agent-card-agent-1")).toBeTruthy();
	});

	it("should show empty message when no agents", () => {
		render(<AgentGrid agents={[]} />);
		expect(screen.getByTestId("agent-grid-empty")).toBeTruthy();
	});

	it("should apply spawn animation when justAuthorized", () => {
		const { container } = render(<AgentGrid agents={[mockAgent]} justAuthorized={true} />);
		const wrapper = container.querySelector("[data-testid='agent-grid'] > div");
		expect(wrapper?.className).toContain("animate-spawn-agent");
	});

	it("should apply reinforcement animation for new agents", () => {
		const { container } = render(
			<AgentGrid agents={[mockAgent]} newReinforcementIds={["agent-1"]} />,
		);
		const wrapper = container.querySelector("[data-testid='agent-grid'] > div");
		expect(wrapper?.className).toContain("animate-reinforcement-arrive");
	});
});

const mockTasks = [
	{
		id: "T-001",
		description: "Build auth module",
		dependencies: [],
		agentRole: "BUILDER" as const,
		estimatedSigma: 0.2,
		estimatedCost: 0.5,
		acceptanceCriteriaIds: ["AC-1"],
		status: TaskStatus.Completed,
	},
	{
		id: "T-002",
		description: "Verify auth module",
		dependencies: ["T-001"],
		agentRole: "VERIFIER" as const,
		estimatedSigma: 0.1,
		estimatedCost: 0.3,
		acceptanceCriteriaIds: ["AC-1"],
		status: TaskStatus.Running,
	},
	{
		id: "T-003",
		description: "Explain PR",
		dependencies: ["T-002"],
		agentRole: "EXPLAINER" as const,
		estimatedSigma: 0.1,
		estimatedCost: 0.2,
		acceptanceCriteriaIds: ["AC-1"],
		status: TaskStatus.Pending,
	},
];

describe("DAGProgress", () => {
	it("should render DAG with nodes", () => {
		render(<DAGProgress tasks={mockTasks} />);
		expect(screen.getByTestId("dag-progress")).toBeTruthy();
		expect(screen.getByTestId("dag-progress-node-T-001")).toBeTruthy();
		expect(screen.getByTestId("dag-progress-node-T-002")).toBeTruthy();
		expect(screen.getByTestId("dag-progress-node-T-003")).toBeTruthy();
	});

	it("should use green fill for completed tasks", () => {
		const { container } = render(<DAGProgress tasks={mockTasks} />);
		const node = container.querySelector("[data-testid='dag-progress-node-T-001'] rect");
		expect(node?.getAttribute("fill")).toBe("#dcfce7");
		expect(node?.getAttribute("stroke")).toBe("#22c55e");
	});

	it("should use blue fill for running tasks", () => {
		const { container } = render(<DAGProgress tasks={mockTasks} />);
		const node = container.querySelector("[data-testid='dag-progress-node-T-002'] rect");
		expect(node?.getAttribute("fill")).toBe("#dbeafe");
		expect(node?.getAttribute("stroke")).toBe("#3b82f6");
	});

	it("should use gray fill for pending tasks", () => {
		const { container } = render(<DAGProgress tasks={mockTasks} />);
		const node = container.querySelector("[data-testid='dag-progress-node-T-003'] rect");
		expect(node?.getAttribute("fill")).toBe("#f3f4f6");
		expect(node?.getAttribute("stroke")).toBe("#9ca3af");
	});

	it("should show empty message when no tasks", () => {
		render(<DAGProgress tasks={[]} />);
		expect(screen.getByTestId("dag-progress-empty")).toBeTruthy();
	});

	it("should apply node-flash animation for recently changed tasks", () => {
		const { container } = render(
			<DAGProgress tasks={mockTasks} recentlyChangedTaskIds={["T-001"]} />,
		);
		const node = container.querySelector("[data-testid='dag-progress-node-T-001']");
		expect(node?.getAttribute("class")).toContain("animate-node-flash");
	});

	it("should apply preserved-glow animation for preserved tasks", () => {
		const { container } = render(<DAGProgress tasks={mockTasks} preservedTaskIds={["T-001"]} />);
		const node = container.querySelector("[data-testid='dag-progress-node-T-001']");
		expect(node?.getAttribute("class")).toContain("animate-preserved-glow");
	});

	it("should show checkmark for preserved tasks", () => {
		render(<DAGProgress tasks={mockTasks} preservedTaskIds={["T-001"]} />);
		expect(screen.getByTestId("preserved-check-T-001")).toBeTruthy();
	});
});

const mockEvents: ActionEvent[] = [
	{
		id: "evt-1",
		timestamp: "2026-02-11T10:00:00Z",
		agentId: "agent-1",
		role: "BUILDER",
		action: "Generating code",
		detail: "auth-module.ts",
	},
	{
		id: "evt-2",
		timestamp: "2026-02-11T10:00:05Z",
		agentId: "agent-2",
		role: "VERIFIER",
		action: "Running CI",
		detail: "3 checks passed",
	},
];

describe("ActionStream", () => {
	it("should render events", () => {
		render(<ActionStream events={mockEvents} />);
		expect(screen.getByTestId("action-stream")).toBeTruthy();
		expect(screen.getByText("Generating code")).toBeTruthy();
		expect(screen.getByText("Running CI")).toBeTruthy();
	});

	it("should show role labels", () => {
		render(<ActionStream events={mockEvents} />);
		expect(screen.getByText("[BUILDER]")).toBeTruthy();
		expect(screen.getByText("[VERIFIER]")).toBeTruthy();
	});

	it("should show details", () => {
		render(<ActionStream events={mockEvents} />);
		expect(screen.getByText("auth-module.ts")).toBeTruthy();
	});

	it("should show empty message when no events", () => {
		render(<ActionStream events={[]} />);
		expect(screen.getByTestId("action-stream-empty")).toBeTruthy();
	});
});

describe("DashboardLayout", () => {
	it("should render all sections", () => {
		render(
			<DashboardLayout
				runId="run-123"
				agents={[mockAgent]}
				tasks={mockTasks}
				events={mockEvents}
				currentSpend={3.5}
				ceiling={10}
				percentUsed={35}
			/>,
		);
		expect(screen.getByTestId("dashboard-layout")).toBeTruthy();
		expect(screen.getByText("run-123")).toBeTruthy();
		expect(screen.getByTestId("agent-grid")).toBeTruthy();
		expect(screen.getByTestId("dag-progress")).toBeTruthy();
		expect(screen.getByTestId("action-stream")).toBeTruthy();
		expect(screen.getByTestId("cost-progress-bar")).toBeTruthy();
	});

	it("should show section headers", () => {
		render(
			<DashboardLayout
				runId="run-1"
				agents={[]}
				tasks={[]}
				events={[]}
				currentSpend={0}
				ceiling={1}
				percentUsed={0}
			/>,
		);
		expect(screen.getByText("Agents")).toBeTruthy();
		expect(screen.getByText("Task Progress")).toBeTruthy();
		expect(screen.getByText("Action Stream")).toBeTruthy();
	});

	it("should thread animation props to children", () => {
		const { container } = render(
			<DashboardLayout
				runId="run-1"
				agents={[mockAgent]}
				tasks={mockTasks}
				events={[]}
				currentSpend={0}
				ceiling={1}
				percentUsed={0}
				justAuthorized={true}
			/>,
		);
		const agentWrapper = container.querySelector("[data-testid='agent-grid'] > div");
		expect(agentWrapper?.className).toContain("animate-spawn-agent");
	});
});
