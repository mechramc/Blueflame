"use client";

import type { PlanTask } from "@blueflame/shared";

interface TaskTableProps {
	tasks: PlanTask[];
}

const STATUS_STYLES: Record<string, string> = {
	PENDING: "text-[--text-muted]",
	RUNNING: "text-blue-400",
	COMPLETED: "text-emerald-400",
	FAILED: "text-red-400",
	DEFERRED: "text-yellow-400",
};

const ROLE_COLORS: Record<string, string> = {
	BUILDER: "text-purple-400",
	VERIFIER: "text-teal-400",
	EXPLAINER: "text-orange-400",
	PLANNER: "text-blue-400",
	FIXER: "text-red-400",
};

export function TaskTable({ tasks }: TaskTableProps) {
	return (
		<div className="overflow-x-auto">
			<table className="min-w-full text-sm">
				<thead>
					<tr className="border-b border-[--border]">
						<th className="px-3 py-2 text-left text-xs font-medium text-[--text-muted]">ID</th>
						<th className="px-3 py-2 text-left text-xs font-medium text-[--text-muted]">
							Description
						</th>
						<th className="px-3 py-2 text-left text-xs font-medium text-[--text-muted]">
							Dependencies
						</th>
						<th className="px-3 py-2 text-left text-xs font-medium text-[--text-muted]">Role</th>
						<th className="px-3 py-2 text-right text-xs font-medium text-[--text-muted]">
							Est. Cost
						</th>
						<th className="px-3 py-2 text-right text-xs font-medium text-[--text-muted]">
							{"\u03C3"}
						</th>
						<th className="px-3 py-2 text-left text-xs font-medium text-[--text-muted]">Status</th>
					</tr>
				</thead>
				<tbody>
					{tasks.map((task, i) => (
						<tr
							key={task.id}
							data-testid={`task-row-${task.id}`}
							className={`border-b border-[--border]/50 ${i % 2 === 0 ? "" : "bg-[--bg-secondary]/30"}`}
						>
							<td className="px-3 py-2 font-mono text-xs text-[--text-secondary]">{task.id}</td>
							<td className="px-3 py-2 max-w-xs truncate text-[--text-primary]">
								{task.description}
							</td>
							<td className="px-3 py-2 font-mono text-xs text-[--text-muted]">
								{task.dependencies.length > 0 ? task.dependencies.join(", ") : "\u2014"}
							</td>
							<td
								className={`px-3 py-2 font-medium ${ROLE_COLORS[task.agentRole] ?? "text-[--text-secondary]"}`}
							>
								{task.agentRole}
							</td>
							<td className="px-3 py-2 text-right font-mono text-[--text-secondary]">
								${task.estimatedCost.toFixed(2)}
							</td>
							<td className="px-3 py-2 text-right font-mono text-[--text-secondary]">
								{task.sigmaEstimate.toFixed(1)}
							</td>
							<td className="px-3 py-2">
								<span
									className={`text-xs font-medium ${STATUS_STYLES[task.status] ?? "text-[--text-muted]"}`}
								>
									{task.status}
								</span>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
