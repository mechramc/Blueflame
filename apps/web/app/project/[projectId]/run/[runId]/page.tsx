"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { PauseDecisionModal } from "@/components/budget/PauseDecisionModal";
import type { ActionEvent } from "@/components/dashboard/ActionStream";
import type { AgentCardData } from "@/components/dashboard/AgentStatusCard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import type { BudgetDecision, PlanTask } from "@blueflame/shared";

interface RunApiResponse {
	status: string;
	plan?: { tasks: PlanTask[] };
	agents?: AgentCardData[];
	events?: ActionEvent[];
}

interface BudgetApiResponse {
	currentSpend: number;
	ceiling: number;
	percentUsed: number;
	pauseTriggered: boolean;
}

/**
 * Run dashboard page — real-time view of execution progress.
 * Polls API for status updates (SignalR integration for production).
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
					setTasks(data.plan.tasks);
				}
				if (data.agents) {
					setAgents(data.agents);
				}
				if (data.events) {
					setEvents(data.events);
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
			/>
			{showPauseModal && (
				<PauseDecisionModal
					currentSpend={currentSpend}
					ceiling={ceiling}
					onDecision={handleBudgetDecision}
				/>
			)}
		</div>
	);
}
