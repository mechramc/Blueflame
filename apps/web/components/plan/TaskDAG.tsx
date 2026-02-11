"use client";

import type { PlanTask } from "@blueflame/shared";

interface TaskDAGProps {
	tasks: PlanTask[];
}

const ROLE_FILLS: Record<string, string> = {
	BUILDER: "#9333ea",
	VERIFIER: "#0d9488",
	EXPLAINER: "#ea580c",
	PLANNER: "#2563eb",
};

interface NodePosition {
	x: number;
	y: number;
	task: PlanTask;
}

/**
 * Simple DAG visualization using SVG.
 * Lays out tasks in topological layers (by dependency depth).
 */
export function TaskDAG({ tasks }: TaskDAGProps) {
	const positions = computeLayout(tasks);

	if (positions.length === 0) {
		return <div className="text-gray-400 text-sm p-4">No tasks to display</div>;
	}

	const maxX = Math.max(...positions.map((p) => p.x)) + 180;
	const maxY = Math.max(...positions.map((p) => p.y)) + 60;

	return (
		<div className="overflow-auto border rounded bg-white" data-testid="task-dag">
			<svg
				width={Math.max(maxX, 300)}
				height={Math.max(maxY, 100)}
				role="img"
				aria-label="Task dependency graph"
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
								markerEnd="url(#arrowhead)"
							/>
						);
					}),
				)}
				{/* Arrowhead marker */}
				<defs>
					<marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
						<polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
					</marker>
				</defs>
				{/* Nodes */}
				{positions.map((node) => (
					<g key={node.task.id} data-testid={`dag-node-${node.task.id}`}>
						<rect
							x={node.x}
							y={node.y}
							width={140}
							height={30}
							rx={4}
							fill={ROLE_FILLS[node.task.agentRole] ?? "#6b7280"}
							opacity={0.15}
							stroke={ROLE_FILLS[node.task.agentRole] ?? "#6b7280"}
							strokeWidth={1.5}
						/>
						<text
							x={node.x + 70}
							y={node.y + 19}
							textAnchor="middle"
							className="text-xs"
							fill={ROLE_FILLS[node.task.agentRole] ?? "#374151"}
							fontFamily="monospace"
							fontSize={11}
						>
							{node.task.id}
						</text>
					</g>
				))}
			</svg>
		</div>
	);
}

/**
 * Compute topological layout: tasks grouped by depth, spaced in layers.
 */
function computeLayout(tasks: PlanTask[]): NodePosition[] {
	const depthMap = new Map<string, number>();

	// Compute depth for each task via topological traversal
	function getDepth(taskId: string): number {
		if (depthMap.has(taskId)) return depthMap.get(taskId)!;
		const task = tasks.find((t) => t.id === taskId);
		if (!task || task.dependencies.length === 0) {
			depthMap.set(taskId, 0);
			return 0;
		}
		const maxDepDeph = Math.max(...task.dependencies.map(getDepth));
		const depth = maxDepDeph + 1;
		depthMap.set(taskId, depth);
		return depth;
	}

	for (const task of tasks) {
		getDepth(task.id);
	}

	// Group by depth
	const layers = new Map<number, PlanTask[]>();
	for (const task of tasks) {
		const depth = depthMap.get(task.id) ?? 0;
		const layer = layers.get(depth) ?? [];
		layer.push(task);
		layers.set(depth, layer);
	}

	// Position nodes: layers vertically, tasks horizontally within each layer
	const positions: NodePosition[] = [];
	const layerY = 50;
	const nodeSpacingX = 170;
	const nodeSpacingY = 60;

	for (const [depth, layerTasks] of layers) {
		for (let i = 0; i < layerTasks.length; i++) {
			const task = layerTasks[i];
			if (task) {
				positions.push({
					x: 20 + i * nodeSpacingX,
					y: layerY + depth * nodeSpacingY,
					task,
				});
			}
		}
	}

	return positions;
}
