"use client";

import type { AgentStatus } from "@blueflame/shared";

export interface AgentCardData {
	agentId: string;
	role: string;
	status: AgentStatus | string;
	taskId: string | null;
	model: string;
	tokensUsed: number;
	costIncurred: number;
	sigmaValue: number;
}

interface AgentStatusCardProps {
	agent: AgentCardData;
}

const DEFAULT_STYLE = { bg: "bg-gray-50 border-gray-300", text: "text-gray-700", dot: "bg-gray-500" };

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
	EXECUTING: { bg: "bg-green-50 border-green-300", text: "text-green-700", dot: "bg-green-500" },
	IDLE: { bg: "bg-yellow-50 border-yellow-300", text: "text-yellow-700", dot: "bg-yellow-500" },
	COMPLETED: { bg: "bg-blue-50 border-blue-300", text: "text-blue-700", dot: "bg-blue-500" },
	FAILED: { bg: "bg-red-50 border-red-300", text: "text-red-700", dot: "bg-red-500" },
};

const ROLE_LABELS: Record<string, string> = {
	BUILDER: "Builder",
	VERIFIER: "Verifier",
	EXPLAINER: "Explainer",
	PLANNER: "Planner",
};

/**
 * Card showing an individual agent's status, task, model, and token count.
 */
export function AgentStatusCard({ agent }: AgentStatusCardProps) {
	const style = STATUS_STYLES[agent.status] ?? DEFAULT_STYLE;

	return (
		<div
			className={`rounded-lg border p-3 ${style.bg}`}
			data-testid={`agent-card-${agent.agentId}`}
		>
			<div className="flex items-center justify-between mb-2">
				<span className="text-sm font-semibold text-gray-900">
					{ROLE_LABELS[agent.role] ?? agent.role}
				</span>
				<span className={`flex items-center gap-1.5 text-xs font-medium ${style.text}`}>
					<span className={`w-2 h-2 rounded-full ${style.dot}`} />
					{agent.status}
				</span>
			</div>
			<div className="space-y-1 text-xs text-gray-600">
				<div className="flex justify-between">
					<span>Task:</span>
					<span className="font-mono">{agent.taskId ?? "—"}</span>
				</div>
				<div className="flex justify-between">
					<span>Model:</span>
					<span className="font-mono">{agent.model}</span>
				</div>
				<div className="flex justify-between">
					<span>Tokens:</span>
					<span className="font-mono">{agent.tokensUsed.toLocaleString()}</span>
				</div>
				<div className="flex justify-between">
					<span>Cost:</span>
					<span className="font-mono">${agent.costIncurred.toFixed(4)}</span>
				</div>
			</div>
		</div>
	);
}
