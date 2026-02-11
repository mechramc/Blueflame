"use client";

import type { PlanTask } from "@blueflame/shared";

interface TaskTableProps {
	tasks: PlanTask[];
}

const STATUS_COLORS: Record<string, string> = {
	PENDING: "bg-gray-100 text-gray-700",
	RUNNING: "bg-blue-100 text-blue-700",
	COMPLETED: "bg-green-100 text-green-700",
	FAILED: "bg-red-100 text-red-700",
	DEFERRED: "bg-yellow-100 text-yellow-700",
};

const ROLE_COLORS: Record<string, string> = {
	BUILDER: "text-purple-600",
	VERIFIER: "text-teal-600",
	EXPLAINER: "text-orange-600",
	PLANNER: "text-blue-600",
};

export function TaskTable({ tasks }: TaskTableProps) {
	return (
		<div className="overflow-x-auto">
			<table className="min-w-full divide-y divide-gray-200 text-sm">
				<thead className="bg-gray-50">
					<tr>
						<th className="px-3 py-2 text-left font-medium text-gray-500">ID</th>
						<th className="px-3 py-2 text-left font-medium text-gray-500">Description</th>
						<th className="px-3 py-2 text-left font-medium text-gray-500">Dependencies</th>
						<th className="px-3 py-2 text-left font-medium text-gray-500">Role</th>
						<th className="px-3 py-2 text-right font-medium text-gray-500">Est. Cost</th>
						<th className="px-3 py-2 text-right font-medium text-gray-500">σ</th>
						<th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-100">
					{tasks.map((task) => (
						<tr key={task.id} data-testid={`task-row-${task.id}`}>
							<td className="px-3 py-2 font-mono text-xs">{task.id}</td>
							<td className="px-3 py-2 max-w-xs truncate">{task.description}</td>
							<td className="px-3 py-2 font-mono text-xs">
								{task.dependencies.length > 0 ? task.dependencies.join(", ") : "—"}
							</td>
							<td className={`px-3 py-2 font-medium ${ROLE_COLORS[task.agentRole] ?? ""}`}>
								{task.agentRole}
							</td>
							<td className="px-3 py-2 text-right font-mono">${task.estimatedCost.toFixed(2)}</td>
							<td className="px-3 py-2 text-right font-mono">{task.sigmaEstimate.toFixed(1)}</td>
							<td className="px-3 py-2">
								<span
									className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[task.status] ?? ""}`}
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
