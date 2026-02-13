import type { PlanLock, PlanTask, TaskPlan } from "@blueflame/shared";
import { AgentRole, RunStatus, TaskStatus } from "@blueflame/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../db.js");
vi.mock("./task-executor.js", () => ({
	executeTask: vi.fn().mockResolvedValue(undefined),
}));

import { clearAllMockStores } from "../__mocks__/db.js";
import { clearAllAgents, getAgentsByRunId, recordAgentUsage, spawnAgent } from "./agent-spawner.js";
import {
	clearAllRuns,
	completeTask,
	executeNextWave,
	failTask,
	getRun,
	getRunSync,
	onBudgetAlert,
	onRunStatusChange,
	requestInterrupt,
	startExecution,
} from "./orchestrator.js";

function makePlan(taskOverrides?: Partial<PlanTask>[]): TaskPlan {
	const tasks: PlanTask[] = taskOverrides
		? taskOverrides.map((o, i) => ({
				id: `TASK-${String(i + 1).padStart(3, "0")}`,
				description: `Task ${i + 1}`,
				acceptanceCriteriaIds: [`AC-${String(i + 1).padStart(3, "0")}`],
				dependencies: [],
				agentRole: AgentRole.Builder,
				estimatedTokens: 1000,
				estimatedCost: 0.01,
				sigmaEstimate: 0.1,
				parallelizable: true,
				status: TaskStatus.Pending,
				...o,
			}))
		: [
				{
					id: "TASK-001",
					description: "Task 1",
					acceptanceCriteriaIds: ["AC-001"],
					dependencies: [],
					agentRole: AgentRole.Builder,
					estimatedTokens: 1000,
					estimatedCost: 0.01,
					sigmaEstimate: 0.1,
					parallelizable: true,
					status: TaskStatus.Pending,
				},
			];

	return {
		id: "plan-1",
		runId: "run-1",
		projectId: "proj-1",
		specId: "spec-1",
		specHash: "abc123",
		tasks,
		totalEstimatedCost: 0.01,
		totalEstimatedTokens: 1000,
		prd: null,
		createdAt: new Date().toISOString(),
	};
}

function makeLock(): PlanLock {
	return {
		id: "lock-1",
		lockId: "lock-1",
		runId: "run-1",
		projectId: "proj-1",
		specHash: "abc123",
		approvedTaskIds: ["TASK-001"],
		budgetCeiling: 10.0,
		agentPermissions: [],
		constraintSnapshot: [],
		authorizedBy: "user-1",
		authorizedAt: new Date().toISOString(),
	};
}

afterEach(() => {
	clearAllRuns();
	clearAllAgents();
	clearAllMockStores();
});

describe("startExecution", () => {
	it("should create a run in EXECUTING status", async () => {
		const plan = makePlan();
		const lock = makeLock();

		const result = await startExecution(plan, lock);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.status).toBe(RunStatus.Executing);
			expect(result.value.runId).toBe("run-1");
		}
	});

	it("should fail if run already exists", async () => {
		const plan = makePlan();
		const lock = makeLock();

		await startExecution(plan, lock);
		const result = await startExecution(plan, lock);
		expect(result.ok).toBe(false);
	});

	it("should notify status callback", async () => {
		const callback = vi.fn();
		onRunStatusChange(callback);

		await startExecution(makePlan(), makeLock());
		expect(callback).toHaveBeenCalledWith("run-1", RunStatus.Executing);
	});
});

describe("executeNextWave", () => {
	it("should spawn agents for ready tasks via auto-advance", async () => {
		// startExecution auto-advances, so agents should already be spawned
		await startExecution(makePlan(), makeLock());

		const agents = getAgentsByRunId("run-1");
		expect(agents.length).toBeGreaterThanOrEqual(1);

		const run = getRunSync("run-1");
		const task = run?.plan.tasks.find((t) => t.id === "TASK-001");
		expect(task?.status).toBe(TaskStatus.Running);
	});

	it("should return empty array when no tasks ready", async () => {
		const plan = makePlan([{ id: "TASK-001", status: TaskStatus.Running }]);
		await startExecution(plan, makeLock());

		const result = await executeNextWave("run-1");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toHaveLength(0);
		}
	});

	it("should fail for unknown run", async () => {
		const result = await executeNextWave("unknown");
		expect(result.ok).toBe(false);
	});

	it("should spawn parallel tasks via auto-advance", async () => {
		const plan = makePlan([{ id: "TASK-001" }, { id: "TASK-002" }]);
		await startExecution(plan, makeLock());

		const agents = getAgentsByRunId("run-1");
		expect(agents.length).toBeGreaterThanOrEqual(2);
	});
});

describe("completeTask", () => {
	it("should spawn verifier on builder completion (A2A handoff)", async () => {
		await startExecution(makePlan(), makeLock());

		// Agent was already spawned by auto-advance in startExecution
		const agents = getAgentsByRunId("run-1");
		const agent = agents.find((a) => a.role === AgentRole.Builder);
		expect(agent).toBeDefined();
		if (!agent) return;

		const result = await completeTask("run-1", "TASK-001", agent.agentId, 500, 0.05);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.verifierAgent).toBeDefined();
			expect(result.value.verifierAgent?.role).toBe(AgentRole.Verifier);
		}
	});

	it("should mark task completed on verifier completion", async () => {
		const plan = makePlan([
			{ id: "TASK-001", agentRole: AgentRole.Verifier, status: TaskStatus.Running },
		]);
		await startExecution(plan, makeLock());

		const agent = await spawnAgent("run-1", AgentRole.Verifier, "TASK-001", "gpt-4o");
		const result = await completeTask("run-1", "TASK-001", agent.agentId, 500, 0.02);
		expect(result.ok).toBe(true);

		const run = getRunSync("run-1");
		const task = run?.plan.tasks.find((t) => t.id === "TASK-001");
		expect(task?.status).toBe(TaskStatus.Completed);
	});

	it("should fail for unknown run", async () => {
		const result = await completeTask("unknown", "TASK-001", "agent-1", 0, 0);
		expect(result.ok).toBe(false);
	});
});

describe("failTask", () => {
	it("should mark task as failed", async () => {
		await startExecution(makePlan(), makeLock());
		await executeNextWave("run-1");

		const result = await failTask("run-1", "TASK-001", "agent-1", 200, 0.01);
		expect(result.ok).toBe(true);

		const run = getRunSync("run-1");
		const task = run?.plan.tasks.find((t) => t.id === "TASK-001");
		expect(task?.status).toBe(TaskStatus.Failed);
	});
});

describe("requestInterrupt", () => {
	it("should set interrupt flag on executing run", async () => {
		await startExecution(makePlan(), makeLock());

		const result = requestInterrupt("run-1");
		expect(result.ok).toBe(true);

		const run = getRunSync("run-1");
		expect(run?.interruptRequested).toBe(true);
	});

	it("should fail for non-executing run", async () => {
		const plan = makePlan();
		await startExecution(plan, makeLock());
		// Manually set to paused for test
		const run = getRunSync("run-1");
		if (run) run.status = RunStatus.Paused;

		const result = requestInterrupt("run-1");
		expect(result.ok).toBe(false);
	});

	it("should cause next executeNextWave to pause", async () => {
		await startExecution(makePlan(), makeLock());
		requestInterrupt("run-1");

		await executeNextWave("run-1");
		const run = getRunSync("run-1");
		expect(run?.status).toBe(RunStatus.Paused);
	});
});

describe("budget enforcement", () => {
	it("should emit budget alert at 80%", async () => {
		const budgetAlert = vi.fn();
		onBudgetAlert(budgetAlert);

		const lock = makeLock();
		lock.budgetCeiling = 1.0;
		await startExecution(makePlan(), lock);

		// Simulate spending 80%+ by recording usage on an agent
		const agent = await spawnAgent("run-1", AgentRole.Builder, "TASK-001", "gpt-4o");
		await recordAgentUsage(agent.agentId, 10000, 0.85);

		await executeNextWave("run-1");
		expect(budgetAlert).toHaveBeenCalled();
	});

	it("should pause run at 95% budget", async () => {
		const lock = makeLock();
		lock.budgetCeiling = 1.0;
		await startExecution(makePlan(), lock);

		const agent = await spawnAgent("run-1", AgentRole.Builder, "TASK-001", "gpt-4o");
		await recordAgentUsage(agent.agentId, 10000, 0.96);

		await executeNextWave("run-1");
		const run = getRunSync("run-1");
		expect(run?.status).toBe(RunStatus.Paused);
	});

	it("should defer pending tasks on budget pause", async () => {
		const lock = makeLock();
		lock.budgetCeiling = 1.0;
		const plan = makePlan([{ id: "TASK-001" }, { id: "TASK-002", dependencies: ["TASK-001"] }]);
		await startExecution(plan, lock);

		const agent = await spawnAgent("run-1", AgentRole.Builder, "TASK-001", "gpt-4o");
		await recordAgentUsage(agent.agentId, 10000, 0.96);

		await executeNextWave("run-1");
		const run = getRunSync("run-1");
		const task2 = run?.plan.tasks.find((t) => t.id === "TASK-002");
		expect(task2?.status).toBe(TaskStatus.Deferred);
	});
});
