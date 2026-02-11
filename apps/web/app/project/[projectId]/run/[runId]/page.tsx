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
import type { BudgetDecision, PlanTask } from "@blueflame/shared";

interface RunApiResponse {
	status: string;
	plan?: { tasks: PlanTask[] };
	agents?: AgentCardData[];
	events?: ActionEvent[];
	violation?: ConstraintViolation;
}

interface BudgetApiResponse {
	currentSpend: number;
	ceiling: number;
	percentUsed: number;
	pauseTriggered: boolean;
}

/**
 * Run dashboard page — real-time view of execution progress.
 * Detects animation states: authorization, reinforcement, violation, spec change.
 */
export default function RunPage() {
	const params = useParams<{ projectId: string; runId: string }>();
	const { runId } = params;

	const [tasks, setTasks] = useState<PlanTask[]>([]);
	const [agents, setAgents] = useState<AgentCardData[]>([]);
	const [events, setEvents] = useState<ActionEvent[]>([]);
	const [currentSpend, setCurrentSpend] = useState(0);
	const [ceiling, setCeiling] = useState(0);
	const [percentUsed, setPercentUsed] = useState(0);
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

	const fetchStatus = useCallback(async () => {
		try {
			const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

			const [runRes, budgetRes] = await Promise.all([
				fetch(`${apiBase}/api/execution/${runId}`),
				fetch(`${apiBase}/api/budget/${runId}`),
			]);

			if (runRes.ok) {
				const data = (await runRes.json()) as RunApiResponse;
				if (data.plan?.tasks) {
					// Detect spec changes — tasks whose status changed
					const changed: string[] = [];
					const preserved: string[] = [];
					for (const task of data.plan.tasks) {
						const prevStatus = prevTaskStatusRef.current.get(task.id);
						if (prevStatus && prevStatus !== task.status) {
							changed.push(task.id);
						} else if (prevStatus && prevStatus === task.status && task.status === "COMPLETED") {
							preserved.push(task.id);
						}
					}
					if (changed.length > 0) {
						setRecentlyChangedTaskIds(changed);
						setPreservedTaskIds(preserved);
						setTimeout(() => {
							setRecentlyChangedTaskIds([]);
							setPreservedTaskIds([]);
						}, 3000);
					}

					// Update prev task status map
					const newMap = new Map<string, string>();
					for (const t of data.plan.tasks) {
						newMap.set(t.id, t.status);
					}
					prevTaskStatusRef.current = newMap;
					setTasks(data.plan.tasks);
				}
				if (data.agents) {
					// Detect new agents (reinforcements)
					const currentIds = new Set(data.agents.map((a) => a.agentId));
					const prevIds = prevAgentIdsRef.current;

					if (!hadAgentsRef.current && currentIds.size > 0) {
						// First time seeing agents → authorization just happened
						setJustAuthorized(true);
						setTimeout(() => setJustAuthorized(false), 2000);
						hadAgentsRef.current = true;
					} else if (hadAgentsRef.current) {
						const reinforcements: string[] = [];
						for (const id of currentIds) {
							if (!prevIds.has(id)) {
								reinforcements.push(id);
							}
						}
						if (reinforcements.length > 0) {
							setNewReinforcementIds(reinforcements);
							setTimeout(() => setNewReinforcementIds([]), 2000);
						}
					}

					prevAgentIdsRef.current = currentIds;
					setAgents(data.agents);
				}
				if (data.events) {
					setEvents(data.events);
				}
				if (data.violation) {
					setViolation(data.violation);
				}
			}

			if (budgetRes.ok) {
				const data = (await budgetRes.json()) as BudgetApiResponse;
				setCurrentSpend(data.currentSpend);
				setCeiling(data.ceiling);
				setPercentUsed(data.percentUsed);
				if (data.pauseTriggered) {
					setShowPauseModal(true);
				}
			}
		} catch {
			// Silently handle fetch errors during polling
		}
	}, [runId]);

	useEffect(() => {
		fetchStatus();
		const interval = setInterval(fetchStatus, 2000);
		return () => clearInterval(interval);
	}, [fetchStatus]);

	const handleBudgetDecision = useCallback(
		async (decision: BudgetDecision, topUpAmount?: number) => {
			setShowPauseModal(false);
			const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
			await fetch(`${apiBase}/api/budget/${runId}/decision`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ decision, topUpAmount }),
			});
			fetchStatus();
		},
		[runId, fetchStatus],
	);

	return (
		<div className="min-h-screen bg-gray-50">
			<DashboardLayout
				runId={runId}
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
