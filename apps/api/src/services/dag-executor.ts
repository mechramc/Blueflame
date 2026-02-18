/**
 * DAG Executor — resolves task execution order from dependency graph.
 *
 * Uses topological sorting to determine which tasks can run in parallel
 * and which must wait for dependencies. Returns execution waves.
 */

import type { PlanTask } from "@blueflame/shared";
import { TaskStatus } from "@blueflame/shared";

/** A wave is a set of tasks that can execute in parallel */
export interface ExecutionWave {
	/** Wave index (0 = first wave) */
	index: number;
	/** Task IDs in this wave */
	taskIds: string[];
}

/**
 * Compute execution waves from a task plan.
 * Tasks with no unresolved dependencies go in the earliest possible wave.
 * Returns waves in order (wave 0 first).
 */
export function computeExecutionWaves(tasks: PlanTask[]): ExecutionWave[] {
	const taskMap = new Map<string, PlanTask>();
	for (const t of tasks) {
		taskMap.set(t.id, t);
	}

	// Compute depth (longest path from root) for each task
	const depths = new Map<string, number>();

	function getDepth(taskId: string): number {
		const cached = depths.get(taskId);
		if (cached !== undefined) return cached;

		const task = taskMap.get(taskId);
		if (!task || task.dependencies.length === 0) {
			depths.set(taskId, 0);
			return 0;
		}

		let maxDepth = 0;
		for (const depId of task.dependencies) {
			if (taskMap.has(depId)) {
				maxDepth = Math.max(maxDepth, getDepth(depId) + 1);
			}
		}

		depths.set(taskId, maxDepth);
		return maxDepth;
	}

	for (const t of tasks) {
		getDepth(t.id);
	}

	// Group by depth into waves
	const waveMap = new Map<number, string[]>();
	for (const t of tasks) {
		const depth = depths.get(t.id) ?? 0;
		const wave = waveMap.get(depth);
		if (wave) {
			wave.push(t.id);
		} else {
			waveMap.set(depth, [t.id]);
		}
	}

	// Sort waves by index
	const sortedKeys = [...waveMap.keys()].sort((a, b) => a - b);
	return sortedKeys.map((key) => ({
		index: key,
		taskIds: waveMap.get(key) ?? [],
	}));
}

/**
 * Get the next batch of ready tasks — tasks whose dependencies are all completed.
 */
export function getReadyTasks(tasks: PlanTask[]): PlanTask[] {
	const completedIds = new Set(
		tasks.filter((t) => t.status === TaskStatus.Completed).map((t) => t.id),
	);

	return tasks.filter((t) => {
		if (t.status !== TaskStatus.Pending) return false;
		return t.dependencies.every((depId) => completedIds.has(depId));
	});
}

/**
 * Check if all tasks are in a terminal state (Completed, Failed, or Deferred).
 */
export function allTasksTerminal(tasks: PlanTask[]): boolean {
	return tasks.every(
		(t) =>
			t.status === TaskStatus.Completed ||
			t.status === TaskStatus.Failed ||
			t.status === TaskStatus.Deferred,
	);
}

/**
 * Find PENDING tasks that can never become ready because a dependency has FAILED.
 * These tasks are "unreachable" and should be deferred to prevent the run from hanging.
 */
export function getUnreachableTasks(tasks: PlanTask[]): PlanTask[] {
	const failedIds = new Set(
		tasks.filter((t) => t.status === TaskStatus.Failed).map((t) => t.id),
	);

	if (failedIds.size === 0) return [];

	// A task is unreachable if any dependency (transitively) has failed
	const unreachableIds = new Set<string>();

	function isUnreachable(task: PlanTask): boolean {
		if (unreachableIds.has(task.id)) return true;
		for (const depId of task.dependencies) {
			if (failedIds.has(depId) || unreachableIds.has(depId)) {
				return true;
			}
		}
		return false;
	}

	// Multi-pass: cascade through dependency chains
	let changed = true;
	while (changed) {
		changed = false;
		for (const task of tasks) {
			if (task.status !== TaskStatus.Pending) continue;
			if (unreachableIds.has(task.id)) continue;
			if (isUnreachable(task)) {
				unreachableIds.add(task.id);
				changed = true;
			}
		}
	}

	return tasks.filter((t) => unreachableIds.has(t.id));
}

/**
 * Check if any tasks have failed.
 */
export function hasFailedTasks(tasks: PlanTask[]): boolean {
	return tasks.some((t) => t.status === TaskStatus.Failed);
}
