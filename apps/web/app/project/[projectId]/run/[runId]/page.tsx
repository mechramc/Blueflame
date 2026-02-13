"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { PauseDecisionModal } from "@/components/budget/PauseDecisionModal";
import {
	type ConstraintViolation,
	ConstraintViolationToast,
} from "@/components/constraints/ConstraintViolationToast";
import type { ActionEvent } from "@/components/dashboard/ActionStream";
import type { AgentCardData } from "@/components/dashboard/AgentStatusCard";
import type { TaskOutput } from "@/components/dashboard/FileTreePane";
import { FixerDiffView } from "@/components/dashboard/FixerDiffView";
import { RunDashboardPanes } from "@/components/dashboard/RunDashboardPanes";
import { apiGet, apiPost } from "@/lib/api-client";
import type { BudgetDecision, PendingFix, PlanTask } from "@blueflame/shared";

interface RunApiResponse {
	status: string;
	plan?: { tasks: PlanTask[] };
	agents?: AgentCardData[];
	events?: ActionEvent[];
	violation?: ConstraintViolation;
	pendingFixes?: PendingFix[];
	taskOutputs?: Record<string, TaskOutput>;
}

interface BudgetApiResponse {
	currentSpend: number;
	ceiling: number;
	percentUsed: number;
	pauseTriggered: boolean;
}

/** Detect tasks whose status changed vs previous poll */
function detectTaskChanges(
	tasks: PlanTask[],
	prevStatusMap: Map<string, string>,
): { changed: string[]; preserved: string[]; newMap: Map<string, string> } {
	const changed: string[] = [];
	const preserved: string[] = [];
	const newMap = new Map<string, string>();

	for (const task of tasks) {
		const prevStatus = prevStatusMap.get(task.id);
		if (prevStatus && prevStatus !== task.status) {
			changed.push(task.id);
		} else if (prevStatus === task.status && task.status === "COMPLETED") {
			preserved.push(task.id);
		}
		newMap.set(task.id, task.status);
	}

	return { changed, preserved, newMap };
}

/** Detect newly-arrived agent IDs (reinforcements) */
function detectNewAgents(currentIds: Set<string>, prevIds: Set<string>): string[] {
	const reinforcements: string[] = [];
	for (const id of currentIds) {
		if (!prevIds.has(id)) {
			reinforcements.push(id);
		}
	}
	return reinforcements;
}

interface TaskAnimationUpdate {
	changed: string[];
	preserved: string[];
	newMap: Map<string, string>;
}

/** Process task data from a poll response */
function processTaskData(
	tasks: PlanTask[],
	prevStatusMap: Map<string, string>,
): TaskAnimationUpdate {
	return detectTaskChanges(tasks, prevStatusMap);
}

interface AgentAnimationResult {
	isFirstSpawn: boolean;
	reinforcements: string[];
}

/** Process agent data from a poll response */
function processAgentAnimations(
	agents: AgentCardData[],
	prevIds: Set<string>,
	hadAgentsBefore: boolean,
): AgentAnimationResult {
	const currentIds = new Set(agents.map((a) => a.agentId));
	if (!hadAgentsBefore && currentIds.size > 0) {
		return { isFirstSpawn: true, reinforcements: [] };
	}
	if (hadAgentsBefore) {
		return { isFirstSpawn: false, reinforcements: detectNewAgents(currentIds, prevIds) };
	}
	return { isFirstSpawn: false, reinforcements: [] };
}

/**
 * Run dashboard page — real-time view of execution progress.
 * Detects animation states: authorization, reinforcement, violation, spec change.
 */
export default function RunPage() {
	const params = useParams<{ projectId: string; runId: string }>();
	const { runId } = params;

	const [runStatus, setRunStatus] = useState("PENDING");
	const [tasks, setTasks] = useState<PlanTask[]>([]);
	const [agents, setAgents] = useState<AgentCardData[]>([]);
	const [events, setEvents] = useState<ActionEvent[]>([]);
	const [currentSpend, setCurrentSpend] = useState(0);
	const [ceiling, setCeiling] = useState(0);
	const [percentUsed, setPercentUsed] = useState(0);
	const [pendingFixes, setPendingFixes] = useState<PendingFix[]>([]);
	const [taskOutputs, setTaskOutputs] = useState<Record<string, TaskOutput>>({});
	const [showPauseModal, setShowPauseModal] = useState(false);

	// Animation states
	const [justAuthorized, setJustAuthorized] = useState(false);
	const [newReinforcementIds, setNewReinforcementIds] = useState<string[]>([]);
	const [recentlyChangedTaskIds, setRecentlyChangedTaskIds] = useState<string[]>([]);
	const [preservedTaskIds, setPreservedTaskIds] = useState<string[]>([]);
	const [violation, setViolation] = useState<ConstraintViolation | null>(null);

	const prevAgentIdsRef = useRef<Set<string>>(new Set());
	const prevTaskStatusRef = useRef<Map<string, string>>(new Map());
	const hadAgentsRef = useRef(false);

	const applyTaskAnimations = useCallback((incomingTasks: PlanTask[]) => {
		const { changed, preserved, newMap } = processTaskData(
			incomingTasks,
			prevTaskStatusRef.current,
		);
		if (changed.length > 0) {
			setRecentlyChangedTaskIds(changed);
			setPreservedTaskIds(preserved);
			setTimeout(() => {
				setRecentlyChangedTaskIds([]);
				setPreservedTaskIds([]);
			}, 3000);
		}
		prevTaskStatusRef.current = newMap;
		setTasks(incomingTasks);
	}, []);

	const applyAgentAnimations = useCallback((incomingAgents: AgentCardData[]) => {
		const anim = processAgentAnimations(
			incomingAgents,
			prevAgentIdsRef.current,
			hadAgentsRef.current,
		);
		if (anim.isFirstSpawn) {
			setJustAuthorized(true);
			setTimeout(() => setJustAuthorized(false), 2000);
			hadAgentsRef.current = true;
		} else if (anim.reinforcements.length > 0) {
			setNewReinforcementIds(anim.reinforcements);
			setTimeout(() => setNewReinforcementIds([]), 2000);
		}
		prevAgentIdsRef.current = new Set(incomingAgents.map((a) => a.agentId));
		setAgents(incomingAgents);
	}, []);

	const processRunData = useCallback(
		(data: RunApiResponse) => {
			if (data.status) setRunStatus(data.status);
			if (data.plan?.tasks) applyTaskAnimations(data.plan.tasks);
			if (data.agents) applyAgentAnimations(data.agents);
			if (data.events) setEvents(data.events);
			if (data.violation) setViolation(data.violation);
			if (data.pendingFixes) setPendingFixes(data.pendingFixes);
			if (data.taskOutputs) setTaskOutputs(data.taskOutputs);
		},
		[applyTaskAnimations, applyAgentAnimations],
	);

	const processBudgetData = useCallback((budgetData: BudgetApiResponse) => {
		setCurrentSpend(budgetData.currentSpend);
		setCeiling(budgetData.ceiling);
		setPercentUsed(budgetData.percentUsed);
		if (budgetData.pauseTriggered) setShowPauseModal(true);
	}, []);

	const fetchStatus = useCallback(async () => {
		try {
			const [data, budgetData] = await Promise.all([
				apiGet<RunApiResponse>(`/api/execution/${runId}`).catch(() => null),
				apiGet<BudgetApiResponse>(`/api/budget/${runId}`).catch(() => null),
			]);
			if (data) processRunData(data);
			if (budgetData) processBudgetData(budgetData);
		} catch {
			// Silently handle fetch errors during polling
		}
	}, [runId, processRunData, processBudgetData]);

	useEffect(() => {
		fetchStatus();
		const interval = setInterval(fetchStatus, 2000);
		return () => clearInterval(interval);
	}, [fetchStatus]);

	const handleApproveFix = useCallback(
		async (taskId: string) => {
			await apiPost(`/api/execution/${runId}/approve-fix`, { taskId }).catch(() => {});
			fetchStatus();
		},
		[runId, fetchStatus],
	);

	const handleRejectFix = useCallback(
		async (taskId: string) => {
			await apiPost(`/api/execution/${runId}/reject-fix`, { taskId }).catch(() => {});
			fetchStatus();
		},
		[runId, fetchStatus],
	);

	const handleBudgetDecision = useCallback(
		async (decision: BudgetDecision, topUpAmount?: number) => {
			setShowPauseModal(false);
			await apiPost(`/api/budget/${runId}/decision`, { decision, topUpAmount }).catch(() => {});
			fetchStatus();
		},
		[runId, fetchStatus],
	);

	const handleStopExecution = useCallback(async () => {
		await apiPost(`/api/execution/${runId}/interrupt`).catch(() => {});
		fetchStatus();
	}, [runId, fetchStatus]);

	const handleRetryFailed = useCallback(async () => {
		await apiPost(`/api/execution/${runId}/retry-failed`).catch(() => {});
		fetchStatus();
	}, [runId, fetchStatus]);

	const isRunning = runStatus === "EXECUTING" || runStatus === "RUNNING";
	const failedTasks = tasks.filter((t) => t.status === "FAILED");
	const isPartial = runStatus === "PARTIAL";

	return (
		<div className="h-full bg-[--bg-primary] flex flex-col">
			{/* Run header with status and stop button */}
			<div className="flex items-center justify-between border-b border-[--border] px-4 py-2 shrink-0">
				<div className="flex items-center gap-3">
					<span className="text-xs font-medium text-[--text-secondary]">
						Run: <span className="text-[--text-primary] font-mono">{runId.slice(0, 20)}</span>
					</span>
					<span
						className={`text-xs px-2 py-0.5 rounded font-medium ${
							isRunning
								? "bg-blue-500/20 text-blue-400"
								: runStatus === "COMPLETED"
									? "bg-emerald-500/20 text-emerald-400"
									: isPartial
										? "bg-amber-500/20 text-amber-400"
										: runStatus === "PAUSED"
											? "bg-yellow-500/20 text-yellow-400"
											: "bg-red-500/20 text-red-400"
						}`}
					>
						{isPartial
							? `PARTIAL — ${failedTasks.length} task${failedTasks.length !== 1 ? "s" : ""} failed`
							: runStatus}
					</span>
				</div>
				<div className="flex items-center gap-2">
					{isPartial && (
						<button
							type="button"
							onClick={handleRetryFailed}
							className="rounded border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20 hover:text-amber-300"
						>
							Retry Failed Tasks
						</button>
					)}
					{isRunning && (
						<button
							type="button"
							onClick={handleStopExecution}
							className="rounded border border-red-500/50 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
						>
							Stop Execution
						</button>
					)}
				</div>
			</div>

			{/* Failed tasks banner */}
			{isPartial && failedTasks.length > 0 && (
				<div className="border-b border-amber-500/30 bg-amber-500/5 px-4 py-2">
					<p className="text-xs font-medium text-amber-400 mb-1">
						{failedTasks.length} task{failedTasks.length !== 1 ? "s" : ""} failed after all retries:
					</p>
					<div className="flex flex-wrap gap-2">
						{failedTasks.map((t) => (
							<span
								key={t.id}
								className="text-xs font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded"
							>
								{t.id}: {t.description.slice(0, 60)}
							</span>
						))}
					</div>
				</div>
			)}
			<div className="flex-1 min-h-0">
				<RunDashboardPanes
					runId={runId}
					runStatus={runStatus}
					agents={agents}
					tasks={tasks}
					events={events}
					currentSpend={currentSpend}
					ceiling={ceiling}
					percentUsed={percentUsed}
					taskOutputs={taskOutputs}
					justAuthorized={justAuthorized}
					newReinforcementIds={newReinforcementIds}
					recentlyChangedTaskIds={recentlyChangedTaskIds}
					preservedTaskIds={preservedTaskIds}
				/>
			</div>
			{/* Fixer Diff Views */}
			{pendingFixes.length > 0 && (
				<div className="px-6 pb-4 space-y-3">
					{pendingFixes.map((fix) => (
						<FixerDiffView
							key={`${fix.taskId}-${fix.retryCount}`}
							fix={fix}
							onApprove={handleApproveFix}
							onReject={handleRejectFix}
						/>
					))}
				</div>
			)}
			{showPauseModal && (
				<PauseDecisionModal
					currentSpend={currentSpend}
					ceiling={ceiling}
					onDecision={handleBudgetDecision}
				/>
			)}
			<ConstraintViolationToast violation={violation} onDismiss={() => setViolation(null)} />
		</div>
	);
}
