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
	justAuthorized?: boolean;
	newReinforcementIds?: string[];
	recentlyChangedTaskIds?: string[];
	preservedTaskIds?: string[];
}

/**
 * Unified run dashboard — dark theme with role-colored agent cards, DAG, and terminal-style stream.
 */
export function DashboardLayout({
	runId,
	agents,
	tasks,
	events,
	currentSpend,
	ceiling,
	percentUsed,
	justAuthorized = false,
	newReinforcementIds = [],
	recentlyChangedTaskIds = [],
	preservedTaskIds = [],
}: DashboardLayoutProps) {
	return (
		<div className="p-4 space-y-4" data-testid="dashboard-layout">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-base font-semibold text-[--text-primary]">
					Run: <span className="font-mono text-[--text-secondary]">{runId}</span>
				</h1>
			</div>

			{/* Budget bar + warning */}
			<div className="space-y-2">
				<CostProgressBar currentSpend={currentSpend} ceiling={ceiling} />
				<BudgetWarning currentSpend={currentSpend} ceiling={ceiling} percentUsed={percentUsed} />
			</div>

			{/* Agent cards */}
			<div>
				<h2 className="text-xs font-semibold uppercase text-[--text-muted] tracking-wider mb-2">
					Agents
				</h2>
				<AgentGrid
					agents={agents}
					justAuthorized={justAuthorized}
					newReinforcementIds={newReinforcementIds}
				/>
			</div>

			{/* DAG progress */}
			<div>
				<h2 className="text-xs font-semibold uppercase text-[--text-muted] tracking-wider mb-2">
					Task Progress
				</h2>
				<DAGProgress
					tasks={tasks}
					recentlyChangedTaskIds={recentlyChangedTaskIds}
					preservedTaskIds={preservedTaskIds}
				/>
			</div>

			{/* Action stream */}
			<div>
				<h2 className="text-xs font-semibold uppercase text-[--text-muted] tracking-wider mb-2">
					Action Stream
				</h2>
				<ActionStream events={events} />
			</div>
		</div>
	);
}
