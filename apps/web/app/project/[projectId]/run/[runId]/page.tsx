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
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { FixerDiffView } from "@/components/dashboard/FixerDiffView";
import { apiGet, apiPost } from "@/lib/api-client";
import type { BudgetDecision, PendingFix, PlanTask } from "@blueflame/shared";

interface RunApiResponse {
	status: string;
	plan?: { tasks: PlanTask[] };
	agents?: AgentCardData[];
	events?: ActionEvent[];
	violation?: ConstraintViolation;
	pendingFixes?: PendingFix[];
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

	return (
		<div className="min-h-screen bg-[--bg-primary]">
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
