"use client";

import type { PlanTask } from "@blueflame/shared";

interface DAGProgressProps {
	tasks: PlanTask[];
}

/** Status → node color mapping: gray (pending) → blue (running) → green (complete) → red (failed) */
const DEFAULT_FILL = { fill: "#f3f4f6", stroke: "#9ca3af" };

const STATUS_FILLS: Record<string, { fill: string; stroke: string }> = {
	PENDING: { fill: "#f3f4f6", stroke: "#9ca3af" },
	RUNNING: { fill: "#dbeafe", stroke: "#3b82f6" },
	COMPLETED: { fill: "#dcfce7", stroke: "#22c55e" },
	FAILED: { fill: "#fee2e2", stroke: "#ef4444" },
	DEFERRED: { fill: "#fef3c7", stroke: "#f59e0b" },
};

interface NodePosition {
	x: number;
	y: number;
	task: PlanTask;
}

/**
 * DAG visualization where nodes light up based on task status.
 * Mirrors TaskDAG layout but uses status-based colors instead of role-based.
 */
export function DAGProgress({ tasks }: DAGProgressProps) {
	const positions = computeLayout(tasks);

	if (positions.length === 0) {
		return (
			<div className="text-gray-400 text-sm p-4" data-testid="dag-progress-empty">
				No tasks to display
			</div>
		);
	}

	const maxX = Math.max(...positions.map((p) => p.x)) + 180;
	const maxY = Math.max(...positions.map((p) => p.y)) + 60;

	return (
		<div className="overflow-auto border rounded bg-white" data-testid="dag-progress">
			<svg
				width={Math.max(maxX, 300)}
				height={Math.max(maxY, 100)}
				role="img"
				aria-label="Task progress graph"
			>
				{/* Edges */}
				{positions.map((node) =>
					node.task.dependencies.map((depId) => {
						const dep = positions.find((p) => p.task.id === depId);
						if (!dep) return null;
						return (
							<line
								key={`${depId}-${node.task.id}`}
								x1={dep.x + 70}
								y1={dep.y + 30}
								x2={node.x + 70}
								y2={node.y}
								stroke="#94a3b8"
								strokeWidth={1.5}
								markerEnd="url(#dag-arrow)"
							/>
						);
					}),
				)}
				<defs>
					<marker id="dag-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
						<polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
					</marker>
				</defs>
				{/* Nodes */}
				{positions.map((node) => {
					const colors = STATUS_FILLS[node.task.status] ?? DEFAULT_FILL;
					return (
						<g key={node.task.id} data-testid={`dag-progress-node-${node.task.id}`}>
							<rect
								x={node.x}
								y={node.y}
								width={140}
								height={30}
								rx={4}
								fill={colors.fill}
								stroke={colors.stroke}
								strokeWidth={2}
							/>
							<text
								x={node.x + 70}
								y={node.y + 19}
								textAnchor="middle"
								fontFamily="monospace"
								fontSize={11}
								fill="#374151"
							>
								{node.task.id}
							</text>
						</g>
					);
				})}
			</svg>
		</div>
	);
}

function computeLayout(tasks: PlanTask[]): NodePosition[] {
	const depthMap = new Map<string, number>();

	function getDepth(taskId: string): number {
		if (depthMap.has(taskId)) return depthMap.get(taskId)!;
		const task = tasks.find((t) => t.id === taskId);
		if (!task || task.dependencies.length === 0) {
			depthMap.set(taskId, 0);
			return 0;
		}
		const maxDep = Math.max(...task.dependencies.map(getDepth));
		const depth = maxDep + 1;
		depthMap.set(taskId, depth);
		return depth;
	}

	for (const task of tasks) {
		getDepth(task.id);
	}

	const layers = new Map<number, PlanTask[]>();
	for (const task of tasks) {
		const depth = depthMap.get(task.id) ?? 0;
		const layer = layers.get(depth) ?? [];
		layer.push(task);
		layers.set(depth, layer);
	}

	const positions: NodePosition[] = [];
	for (const [depth, layerTasks] of layers) {
		for (let i = 0; i < layerTasks.length; i++) {
			const task = layerTasks[i];
			if (task) {
				positions.push({
					x: 20 + i * 170,
					y: 50 + depth * 60,
					task,
				});
			}
		}
	}

	return positions;
}
