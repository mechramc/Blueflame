"use client";

import type { PlanTask } from "@blueflame/shared";

import { BudgetWarning } from "../budget/BudgetWarning";
import { CostProgressBar } from "../budget/CostProgressBar";
import { type ActionEvent, ActionStream } from "./ActionStream";
import { AgentGrid } from "./AgentGrid";
import type { AgentCardData } from "./AgentStatusCard";
import { DAGProgress } from "./DAGProgress";

interface DashboardLayoutProps {
	runId: string;
	agents: AgentCardData[];
	tasks: PlanTask[];
	events: ActionEvent[];
	currentSpend: number;
	ceiling: number;
	percentUsed: number;
}

/**
 * Unified run dashboard combining: agent cards, DAG progress, cost bar, and action stream.
 */
export function DashboardLayout({
	runId,
	agents,
	tasks,
	events,
	currentSpend,
	ceiling,
	percentUsed,
}: DashboardLayoutProps) {
	return (
		<div className="p-4 space-y-4" data-testid="dashboard-layout">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-lg font-semibold text-gray-900">
					Run: <span className="font-mono">{runId}</span>
				</h1>
			</div>

			{/* Budget bar + warning */}
			<div className="space-y-2">
				<CostProgressBar currentSpend={currentSpend} ceiling={ceiling} />
				<BudgetWarning currentSpend={currentSpend} ceiling={ceiling} percentUsed={percentUsed} />
			</div>

			{/* Agent cards */}
			<div>
				<h2 className="text-sm font-semibold text-gray-700 mb-2">Agents</h2>
				<AgentGrid agents={agents} />
			</div>

			{/* DAG progress */}
			<div>
				<h2 className="text-sm font-semibold text-gray-700 mb-2">Task Progress</h2>
				<DAGProgress tasks={tasks} />
			</div>

			{/* Action stream */}
			<div>
				<h2 className="text-sm font-semibold text-gray-700 mb-2">Action Stream</h2>
				<ActionStream events={events} />
			</div>
		</div>
	);
}
