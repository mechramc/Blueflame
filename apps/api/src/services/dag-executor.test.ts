import { describe, expect, it } from "vitest";
import type { PlanTask } from "@blueflame/shared";
import { AgentRole, TaskStatus } from "@blueflame/shared";
import {
	allTasksTerminal,
	computeExecutionWaves,
	getReadyTasks,
	hasFailedTasks,
} from "./dag-executor.js";

function makeTask(overrides: Partial<PlanTask> & { id: string }): PlanTask {
	return {
		description: "Test task",
		acceptanceCriteriaIds: [],
		dependencies: [],
		agentRole: AgentRole.Builder,
		estimatedTokens: 1000,
		estimatedCost: 0.01,
		sigmaEstimate: 0.1,
		parallelizable: true,
		status: TaskStatus.Pending,
		...overrides,
	};
}

describe("computeExecutionWaves", () => {
	it("should put independent tasks in wave 0", () => {
		const tasks = [
			makeTask({ id: "T1" }),
			makeTask({ id: "T2" }),
			makeTask({ id: "T3" }),
		];

		const waves = computeExecutionWaves(tasks);
		expect(waves).toHaveLength(1);
		expect(waves[0]?.taskIds).toEqual(["T1", "T2", "T3"]);
	});

	it("should create sequential waves for linear dependencies", () => {
		const tasks = [
			makeTask({ id: "T1" }),
			makeTask({ id: "T2", dependencies: ["T1"] }),
			makeTask({ id: "T3", dependencies: ["T2"] }),
		];

		const waves = computeExecutionWaves(tasks);
		expect(waves).toHaveLength(3);
		expect(waves[0]?.taskIds).toEqual(["T1"]);
		expect(waves[1]?.taskIds).toEqual(["T2"]);
		expect(waves[2]?.taskIds).toEqual(["T3"]);
	});

	it("should parallelize tasks with same dependencies", () => {
		const tasks = [
			makeTask({ id: "T1" }),
			makeTask({ id: "T2", dependencies: ["T1"] }),
			makeTask({ id: "T3", dependencies: ["T1"] }),
		];

		const waves = computeExecutionWaves(tasks);
		expect(waves).toHaveLength(2);
		expect(waves[0]?.taskIds).toEqual(["T1"]);
		expect(waves[1]?.taskIds.sort()).toEqual(["T2", "T3"]);
	});

	it("should handle diamond dependencies", () => {
		const tasks = [
			makeTask({ id: "T1" }),
			makeTask({ id: "T2", dependencies: ["T1"] }),
			makeTask({ id: "T3", dependencies: ["T1"] }),
			makeTask({ id: "T4", dependencies: ["T2", "T3"] }),
		];

		const waves = computeExecutionWaves(tasks);
		expect(waves).toHaveLength(3);
		expect(waves[2]?.taskIds).toEqual(["T4"]);
	});

	it("should handle empty task list", () => {
		const waves = computeExecutionWaves([]);
		expect(waves).toHaveLength(0);
	});
});

describe("getReadyTasks", () => {
	it("should return tasks with no dependencies when all pending", () => {
		const tasks = [
			makeTask({ id: "T1" }),
			makeTask({ id: "T2", dependencies: ["T1"] }),
		];

		const ready = getReadyTasks(tasks);
		expect(ready).toHaveLength(1);
		expect(ready[0]?.id).toBe("T1");
	});

	it("should return dependent tasks when dependencies are completed", () => {
		const tasks = [
			makeTask({ id: "T1", status: TaskStatus.Completed }),
			makeTask({ id: "T2", dependencies: ["T1"] }),
		];

		const ready = getReadyTasks(tasks);
		expect(ready).toHaveLength(1);
		expect(ready[0]?.id).toBe("T2");
	});

	it("should not return tasks that are already running", () => {
		const tasks = [
			makeTask({ id: "T1", status: TaskStatus.Running }),
		];

		const ready = getReadyTasks(tasks);
		expect(ready).toHaveLength(0);
	});

	it("should not return tasks with incomplete dependencies", () => {
		const tasks = [
			makeTask({ id: "T1", status: TaskStatus.Running }),
			makeTask({ id: "T2", dependencies: ["T1"] }),
		];

		const ready = getReadyTasks(tasks);
		expect(ready).toHaveLength(0);
	});

	it("should return multiple ready tasks in parallel", () => {
		const tasks = [
			makeTask({ id: "T1", status: TaskStatus.Completed }),
			makeTask({ id: "T2", dependencies: ["T1"] }),
			makeTask({ id: "T3", dependencies: ["T1"] }),
		];

		const ready = getReadyTasks(tasks);
		expect(ready).toHaveLength(2);
	});
});

describe("allTasksTerminal", () => {
	it("should return true when all tasks completed", () => {
		const tasks = [
			makeTask({ id: "T1", status: TaskStatus.Completed }),
			makeTask({ id: "T2", status: TaskStatus.Completed }),
		];
		expect(allTasksTerminal(tasks)).toBe(true);
	});

	it("should return true when tasks are mix of completed, failed, deferred", () => {
		const tasks = [
			makeTask({ id: "T1", status: TaskStatus.Completed }),
			makeTask({ id: "T2", status: TaskStatus.Failed }),
			makeTask({ id: "T3", status: TaskStatus.Deferred }),
		];
		expect(allTasksTerminal(tasks)).toBe(true);
	});

	it("should return false when any task is pending", () => {
		const tasks = [
			makeTask({ id: "T1", status: TaskStatus.Completed }),
			makeTask({ id: "T2", status: TaskStatus.Pending }),
		];
		expect(allTasksTerminal(tasks)).toBe(false);
	});

	it("should return false when any task is running", () => {
		const tasks = [
			makeTask({ id: "T1", status: TaskStatus.Running }),
		];
		expect(allTasksTerminal(tasks)).toBe(false);
	});
});

describe("hasFailedTasks", () => {
	it("should return true when a task has failed", () => {
		const tasks = [
			makeTask({ id: "T1", status: TaskStatus.Completed }),
			makeTask({ id: "T2", status: TaskStatus.Failed }),
		];
		expect(hasFailedTasks(tasks)).toBe(true);
	});

	it("should return false when no tasks have failed", () => {
		const tasks = [
			makeTask({ id: "T1", status: TaskStatus.Completed }),
			makeTask({ id: "T2", status: TaskStatus.Completed }),
		];
		expect(hasFailedTasks(tasks)).toBe(false);
	});
});
