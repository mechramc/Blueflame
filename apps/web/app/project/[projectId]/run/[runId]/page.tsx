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
import { PostRunActionsPanel } from "@/components/deployment/PostRunActionsPanel";
import { SpecViewerPanel } from "@/components/spec/SpecViewerPanel";
import { useRole } from "@/hooks/useRole";
import { apiGet, apiPost } from "@/lib/api-client";
import { UserRole } from "@blueflame/shared";
import type { BudgetDecision, DeploymentState, PendingFix, PlanTask } from "@blueflame/shared";

interface RunApiResponse {
	status: string;
	projectId?: string;
	specId?: string;
	plan?: { tasks: PlanTask[] };
	agents?: AgentCardData[];
	events?: ActionEvent[];
	violation?: ConstraintViolation;
	pendingFixes?: PendingFix[];
	taskOutputs?: Record<string, TaskOutput>;
	deploymentState?: DeploymentState | null;
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
	const [deploymentState, setDeploymentState] = useState<DeploymentState | null>(null);
	const [showPauseModal, setShowPauseModal] = useState(false);
	const [showSpec, setShowSpec] = useState(false);
	const [selectedTask, setSelectedTask] = useState<PlanTask | null>(null);

	// Run completion notification
	const [completionBanner, setCompletionBanner] = useState<{
		type: "success" | "partial";
		failedCount: number;
	} | null>(null);
	const prevRunStatusRef = useRef<string>("PENDING");

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
			if (data.deploymentState !== undefined) setDeploymentState(data.deploymentState ?? null);
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

	const failedTasks = tasks.filter((t) => t.status === "FAILED");

	// Detect run completion transitions → show banner
	useEffect(() => {
		const prev = prevRunStatusRef.current;
		const wasRunning = prev === "EXECUTING" || prev === "RUNNING";
		prevRunStatusRef.current = runStatus;

		if (!wasRunning) return;

		if (runStatus === "PARTIAL") {
			setCompletionBanner({ type: "partial", failedCount: failedTasks.length });
			const timer = setTimeout(() => setCompletionBanner(null), 10_000);
			return () => clearTimeout(timer);
		}
		if (runStatus === "COMPLETED") {
			setCompletionBanner({ type: "success", failedCount: 0 });
			const timer = setTimeout(() => setCompletionBanner(null), 5_000);
			return () => clearTimeout(timer);
		}
	}, [runStatus, failedTasks.length]);

	const handleApproveFix = useCallback(
		async (taskId: string) => {
			await apiPost(`/api/execution/${runId}/approve-fix`, { taskId }).catch(() => {});
			fetchStatus();
		},
		[runId, fetchStatus],
	);

	const handleRejectFix = useCallback(
		async (taskId: string, guidance?: string) => {
			await apiPost(`/api/execution/${runId}/reject-fix`, { taskId, guidance }).catch(() => {});
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

	const { hasMinimumRole } = useRole();
	const isAdmin = hasMinimumRole(UserRole.Admin);

	const [overrideError, setOverrideError] = useState<string | null>(null);

	const handleOverrideTask = useCallback(
		async (taskId: string) => {
			setOverrideError(null);
			try {
				const result = await apiPost<{ runId: string; taskId: string; status: string }>(
					`/api/execution/${runId}/override-task`,
					{
						taskId,
						reason: "Admin override — will test manually",
					},
				);
				console.log("[Override] Success:", result);
			} catch (err) {
				const msg = err instanceof Error ? err.message : "Override failed";
				console.error("[Override] Error:", msg);
				setOverrideError(`Override ${taskId}: ${msg}`);
			}
			fetchStatus();
		},
		[runId, fetchStatus],
	);

	const handleSelectTask = useCallback((task: PlanTask) => {
		setSelectedTask((prev) => (prev?.id === task.id ? null : task));
	}, []);

	// Keep selectedTask in sync with latest poll data
	useEffect(() => {
		if (selectedTask) {
			const updated = tasks.find((t) => t.id === selectedTask.id);
			if (updated && updated.status !== selectedTask.status) {
				setSelectedTask(updated);
			}
		}
	}, [tasks, selectedTask]);

	const isRunning = runStatus === "EXECUTING" || runStatus === "RUNNING";
	const isAuthorized = runStatus === "AUTHORIZED";
	const isPartial = runStatus === "PARTIAL";
	const hasFailures = failedTasks.length > 0;

	const handleStartDeltaExecution = useCallback(async () => {
		await apiPost(`/api/execution/${runId}/advance`).catch(() => {});
		fetchStatus();
	}, [runId, fetchStatus]);

	return (
		<div className="h-full bg-[--bg-primary] flex flex-col">
			{/* Run header with status and stop button */}
			<div className="flex items-center justify-between border-b border-[--border] px-4 py-2 shrink-0">
				<div className="flex items-center gap-3">
					<span className="text-xs font-medium text-[--text-secondary]">
						Run: <span className="text-[--text-primary] font-mono">{runId.slice(0, 20)}</span>
					</span>
					<span
						data-testid="run-status-badge"
						className={`text-xs px-2 py-0.5 rounded font-medium ${
							isAuthorized
								? "bg-purple-500/20 text-purple-400"
								: isRunning
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
						{isAuthorized
							? "AUTHORIZED — Ready to execute"
							: isPartial
								? `PARTIAL — ${failedTasks.length} task${failedTasks.length !== 1 ? "s" : ""} failed`
								: runStatus}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setShowSpec((prev) => !prev)}
						className={`rounded border px-3 py-1 text-xs font-medium transition-colors ${
							showSpec
								? "border-[--accent] bg-[--accent]/10 text-[--accent]"
								: "border-[--border] bg-[--bg-secondary] text-[--text-secondary] hover:text-[--text-primary]"
						}`}
					>
						{showSpec ? "Hide Spec" : "View Spec"}
					</button>
					{isAuthorized && (
						<button
							type="button"
							onClick={handleStartDeltaExecution}
							data-testid="start-execution-button"
							className="rounded border border-emerald-500/50 bg-emerald-600 px-4 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
						>
							Start Execution
						</button>
					)}
					{(isPartial || hasFailures) && (
						<button
							type="button"
							onClick={handleRetryFailed}
							data-testid="retry-failed-tasks-button"
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
							{hasFailures ? "Force Stop" : "Stop Execution"}
						</button>
					)}
				</div>
			</div>

			{/* Authorized banner — delta patch applied, awaiting user approval to start */}
			{isAuthorized && (
				<div className="border-b border-purple-500/30 bg-purple-500/5 px-4 py-3">
					<p className="text-sm font-medium text-purple-400 mb-1">
						Delta patch applied — review the updated plan below
					</p>
					<p className="text-xs text-[--text-muted]">
						Tasks have been updated based on the spec change. Click{" "}
						<strong className="text-purple-300">Start Execution</strong> when ready to proceed.
					</p>
				</div>
			)}
			{/* Failed tasks banner — shown whenever tasks have failed, even if run is still EXECUTING */}
			{hasFailures && (
				<div className="border-b border-amber-500/30 bg-amber-500/5 px-4 py-2">
					<p className="text-xs font-medium text-amber-400 mb-1">
						{failedTasks.length} task{failedTasks.length !== 1 ? "s" : ""} failed after all retries:
					</p>
					<div className="space-y-1.5">
						{failedTasks.map((t) => (
							<div key={t.id} className="flex items-center gap-2">
								<span
									className="text-xs font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded flex-1 min-w-0 truncate"
									title={t.failureReason ?? t.description}
								>
									{t.id}: {t.failureReason ?? t.description.slice(0, 60)}
								</span>
								{isAdmin && (
									<button
										type="button"
										onClick={() => handleOverrideTask(t.id)}
										data-testid={`override-task-${t.id}`}
										title="Admin: Skip this task and mark as complete (you will test manually)"
										className="shrink-0 rounded border border-purple-500/50 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-400 transition-colors hover:bg-purple-500/20 hover:text-purple-300"
									>
										Override
									</button>
								)}
							</div>
						))}
					</div>
				</div>
			)}
			{/* Override error banner */}
			{overrideError && (
				<div className="border-b border-red-500/30 bg-red-500/5 px-4 py-2 flex items-center justify-between">
					<span className="text-xs text-red-400">{overrideError}</span>
					<button
						type="button"
						onClick={() => setOverrideError(null)}
						className="text-xs text-red-300 hover:text-red-200 ml-2"
					>
						Dismiss
					</button>
				</div>
			)}
			{/* Run completion notification banner */}
			{completionBanner && (
				<div
					data-testid="completion-banner"
					className={`flex items-center justify-between px-4 py-2 border-b ${
						completionBanner.type === "success"
							? "bg-emerald-500/10 border-emerald-500/30"
							: "bg-red-500/10 border-red-500/30"
					}`}
				>
					<p
						className={`text-sm font-medium ${
							completionBanner.type === "success" ? "text-emerald-400" : "text-red-400"
						}`}
					>
						{completionBanner.type === "success"
							? "Run completed successfully"
							: `Run completed with ${completionBanner.failedCount} failed task${completionBanner.failedCount !== 1 ? "s" : ""}`}
					</p>
					<button
						type="button"
						onClick={() => setCompletionBanner(null)}
						className={`text-xs px-2 py-0.5 rounded ${
							completionBanner.type === "success"
								? "text-emerald-400 hover:bg-emerald-500/20"
								: "text-red-400 hover:bg-red-500/20"
						}`}
					>
						Dismiss
					</button>
				</div>
			)}
			{showSpec && <SpecViewerPanel projectId={params.projectId} />}
			{/* Task detail panel — shown when a task is clicked in the DAG */}
			{selectedTask && (
				<div className="border-b border-[--border] bg-[--bg-secondary] px-4 py-3">
					<div className="flex items-start justify-between gap-4">
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-1">
								<span className="text-xs font-mono font-semibold text-[--text-primary]">
									{selectedTask.id}
								</span>
								<span
									className={`text-xs px-1.5 py-0.5 rounded font-medium ${
										selectedTask.status === "FAILED"
											? "bg-red-500/20 text-red-400"
											: selectedTask.status === "COMPLETED"
												? "bg-emerald-500/20 text-emerald-400"
												: selectedTask.status === "RUNNING"
													? "bg-blue-500/20 text-blue-400"
													: selectedTask.status === "DEFERRED"
														? "bg-amber-500/20 text-amber-400"
														: "bg-gray-500/20 text-gray-400"
									}`}
								>
									{selectedTask.status}
								</span>
							</div>
							<p className="text-xs text-[--text-secondary] mb-1">{selectedTask.description}</p>
							{selectedTask.failureReason && (
								<div className="mt-2 rounded border border-red-500/30 bg-red-500/5 px-3 py-2">
									<p className="text-xs font-medium text-red-400 mb-1">Failure Reason:</p>
									<p className="text-xs text-red-300 font-mono whitespace-pre-wrap">
										{selectedTask.failureReason}
									</p>
								</div>
							)}
							{/* Agent Output — shown for completed/failed tasks with output */}
							{(() => {
								const output = taskOutputs[selectedTask.id];
								if (!output) return null;
								return (
									<details className="mt-2 group">
										<summary className="text-xs font-medium text-[--accent] cursor-pointer hover:underline">
											Agent Output ({output.files?.length ?? 0} files)
										</summary>
										<div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
											{output.commitMessage && (
												<div className="rounded border border-[--border] bg-[--bg-primary] px-3 py-2">
													<p className="text-[10px] text-[--text-muted] mb-0.5">Commit</p>
													<p className="text-xs text-[--text-primary] font-mono">
														{output.commitMessage}
													</p>
												</div>
											)}
											{output.files?.map((f) => (
												<div
													key={f.path}
													className="rounded border border-[--border] bg-[--bg-primary] px-3 py-2"
												>
													<div className="flex items-center gap-2 mb-1">
														<span className="text-[10px] font-mono text-[--accent]">{f.path}</span>
														<span className="text-[9px] px-1 py-0.5 rounded bg-[--bg-tertiary] text-[--text-muted]">
															{f.action}
														</span>
													</div>
													<pre className="text-[10px] text-[--text-secondary] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
														{f.content.slice(0, 500)}
														{f.content.length > 500 ? "\n..." : ""}
													</pre>
												</div>
											))}
											{output.error && (
												<div className="rounded border border-red-500/30 bg-red-500/5 px-3 py-2">
													<p className="text-xs text-red-400 font-mono">{output.error}</p>
												</div>
											)}
										</div>
									</details>
								);
							})()}
						</div>
						<button
							type="button"
							onClick={() => setSelectedTask(null)}
							className="text-[--text-muted] hover:text-[--text-primary] text-sm shrink-0"
						>
							&times;
						</button>
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
					selectedTaskId={selectedTask?.id ?? null}
					onSelectTask={handleSelectTask}
				/>
			</div>
			{/* Fixer Diff Views */}
			{pendingFixes.length > 0 && (
				<div className="px-6 pb-4 space-y-3">
					{pendingFixes.map((fix) => (
						<FixerDiffView
							key={`${fix.taskId}-${fix.retryCount}`}
							fix={fix}
							taskFailureReason={tasks.find((t) => t.id === fix.taskId)?.failureReason}
							onApprove={handleApproveFix}
							onReject={handleRejectFix}
						/>
					))}
				</div>
			)}
			{/* Post-run deployment actions */}
			{(runStatus === "COMPLETED" || runStatus === "PARTIAL") && (
				<PostRunActionsPanel
					runId={runId}
					taskOutputs={taskOutputs}
					deploymentState={deploymentState}
					onRefresh={fetchStatus}
				/>
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
