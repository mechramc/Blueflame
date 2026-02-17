"use client";

import type { PlanTask } from "@blueflame/shared";

interface DAGProgressProps {
	tasks: PlanTask[];
	recentlyChangedTaskIds?: string[];
	preservedTaskIds?: string[];
	selectedTaskId?: string | null;
	onSelectTask?: (task: PlanTask) => void;
}

const DEFAULT_FILL = { fill: "#1a1a2e", stroke: "#555570" };

const STATUS_FILLS: Record<string, { fill: string; stroke: string }> = {
	PENDING: { fill: "#1a1a2e", stroke: "#555570" },
	RUNNING: { fill: "#1e3a5f", stroke: "#3b82f6" },
	COMPLETED: { fill: "#1a3a2e", stroke: "#22c55e" },
	FAILED: { fill: "#3a1a1a", stroke: "#ef4444" },
	DEFERRED: { fill: "#2e2a1a", stroke: "#f59e0b" },
};

interface NodePosition {
	x: number;
	y: number;
	task: PlanTask;
}

export function DAGProgress({
	tasks,
	recentlyChangedTaskIds = [],
	preservedTaskIds = [],
	selectedTaskId,
	onSelectTask,
}: DAGProgressProps) {
	const positions = computeLayout(tasks);

	if (positions.length === 0) {
		return (
			<div className="text-[--text-muted] text-sm p-4" data-testid="dag-progress-empty">
				No tasks to display
			</div>
		);
	}

	const maxX = Math.max(...positions.map((p) => p.x)) + 180;
	const maxY = Math.max(...positions.map((p) => p.y)) + 60;

	return (
		<div
			className="overflow-auto border border-[--border] rounded bg-[--bg-secondary]"
			data-testid="dag-progress"
		>
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
								stroke="#2a2a4a"
								strokeWidth={1.5}
								markerEnd="url(#dag-arrow)"
							/>
						);
					}),
				)}
				<defs>
					<marker id="dag-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
						<polygon points="0 0, 8 3, 0 6" fill="#2a2a4a" />
					</marker>
				</defs>
				{/* Nodes */}
				{positions.map((node) => {
					const colors = STATUS_FILLS[node.task.status] ?? DEFAULT_FILL;
					const isChanged = recentlyChangedTaskIds.includes(node.task.id);
					const isPreserved = preservedTaskIds.includes(node.task.id);
					const isRebuilding = isChanged && node.task.status === "RUNNING";

					let animStyle = "";
					if (isChanged && !isRebuilding) {
						animStyle = "animate-node-flash";
					} else if (isPreserved) {
						animStyle = "animate-preserved-glow";
					} else if (isRebuilding) {
						animStyle = "animate-rebuild-pulse";
					}

					const isSelected = selectedTaskId === node.task.id;

					return (
						<g
							key={node.task.id}
							data-testid={`dag-progress-node-${node.task.id}`}
							className={animStyle}
							style={{ cursor: onSelectTask ? "pointer" : "default" }}
							onClick={() => onSelectTask?.(node.task)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") onSelectTask?.(node.task);
							}}
							tabIndex={onSelectTask ? 0 : undefined}
							role={onSelectTask ? "button" : undefined}
						>
							<rect
								x={node.x}
								y={node.y}
								width={140}
								height={30}
								rx={4}
								fill={colors.fill}
								stroke={isSelected ? "#8b5cf6" : colors.stroke}
								strokeWidth={isSelected ? 2.5 : 1.5}
							/>
							<text
								x={node.x + 70}
								y={node.y + 19}
								textAnchor="middle"
								fontFamily="monospace"
								fontSize={11}
								fill="#e4e4ed"
							>
								{node.task.id}
							</text>
							{isPreserved && (
								<text
									x={node.x + 130}
									y={node.y + 12}
									fontSize={12}
									fill="#22c55e"
									data-testid={`preserved-check-${node.task.id}`}
								>
									{"\u2713"}
								</text>
							)}
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
		const cached = depthMap.get(taskId);
		if (cached !== undefined) return cached;
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
