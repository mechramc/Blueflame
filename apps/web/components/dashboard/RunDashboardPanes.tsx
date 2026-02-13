"use client";

import { useState } from "react";

import type { PlanTask } from "@blueflame/shared";

import { SplitView } from "../layout/SplitView";
import type { ActionEvent } from "./ActionStream";
import type { AgentCardData } from "./AgentStatusCard";
import { CodeViewerPane } from "./CodeViewerPane";
import { DashboardLayout } from "./DashboardLayout";
import { FileTreePane, type TaskOutput } from "./FileTreePane";

interface RunDashboardPanesProps {
	runId: string;
	runStatus: string;
	agents: AgentCardData[];
	tasks: PlanTask[];
	events: ActionEvent[];
	currentSpend: number;
	ceiling: number;
	percentUsed: number;
	taskOutputs: Record<string, TaskOutput>;
	justAuthorized?: boolean;
	newReinforcementIds?: string[];
	recentlyChangedTaskIds?: string[];
	preservedTaskIds?: string[];
}

/**
 * RunDashboardPanes — 3-pane IDE-style layout.
 * Left: File tree | Center: Code viewer | Right: Dashboard (agents, DAG, stream)
 */
export function RunDashboardPanes({
	runId,
	runStatus,
	agents,
	tasks,
	events,
	currentSpend,
	ceiling,
	percentUsed,
	taskOutputs,
	justAuthorized,
	newReinforcementIds,
	recentlyChangedTaskIds,
	preservedTaskIds,
}: RunDashboardPanesProps) {
	const [selectedFile, setSelectedFile] = useState<{ path: string; content: string } | null>(null);

	return (
		<SplitView
			defaultLeftPercent={18}
			minWidth={160}
			left={
				<FileTreePane
					taskOutputs={taskOutputs}
					tasks={tasks}
					selectedFilePath={selectedFile?.path ?? null}
					onSelectFile={setSelectedFile}
				/>
			}
			right={
				<SplitView
					defaultLeftPercent={45}
					minWidth={200}
					left={<CodeViewerPane selectedFile={selectedFile} />}
					right={
						<div className="h-full overflow-y-auto">
							<DashboardLayout
								runId={runId}
								runStatus={runStatus}
								agents={agents}
								tasks={tasks}
								events={events}
								currentSpend={currentSpend}
								ceiling={ceiling}
								percentUsed={percentUsed}
								justAuthorized={justAuthorized}
								newReinforcementIds={newReinforcementIds}
								recentlyChangedTaskIds={recentlyChangedTaskIds}
								preservedTaskIds={preservedTaskIds}
							/>
						</div>
					}
				/>
			}
		/>
	);
}
