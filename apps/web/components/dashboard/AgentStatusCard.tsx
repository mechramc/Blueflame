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
	isBlocked?: boolean;
}

interface AgentStatusCardProps {
	agent: AgentCardData;
}

const STATUS_DOT: Record<string, string> = {
	EXECUTING: "bg-emerald-400 animate-pulse",
	IDLE: "bg-yellow-400",
	COMPLETED: "bg-blue-400",
	FAILED: "bg-red-400",
};

const ROLE_BORDER: Record<string, string> = {
	BUILDER: "border-l-purple-500",
	VERIFIER: "border-l-teal-500",
	EXPLAINER: "border-l-orange-500",
	PLANNER: "border-l-blue-500",
	FIXER: "border-l-red-500",
};

const ROLE_LABELS: Record<string, string> = {
	BUILDER: "Builder",
	VERIFIER: "Verifier",
	EXPLAINER: "Explainer",
	PLANNER: "Planner",
	FIXER: "Fixer",
};

const SIGMA_THRESHOLD = 0.7;

export function AgentStatusCard({ agent }: AgentStatusCardProps) {
	const dotColor = STATUS_DOT[agent.status] ?? "bg-[--text-muted]";
	const borderColor = ROLE_BORDER[agent.role] ?? "border-l-[--text-muted]";
	const isHighSigma = agent.sigmaValue >= SIGMA_THRESHOLD;
	const sigmaPercent = Math.min(agent.sigmaValue * 100, 100);

	const isExecuting = agent.status === "EXECUTING";
	const animClass = agent.isBlocked
		? "animate-flash-red"
		: isHighSigma
			? "animate-escalate-pulse"
			: isExecuting
				? "animate-pulse"
				: "";

	return (
		<div
			className={`rounded border bg-[--bg-secondary] border-l-2 ${borderColor} p-3 ${animClass} ${
				isExecuting
					? "border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.15)]"
					: "border-[--border]"
			}`}
			data-testid={`agent-card-${agent.agentId}`}
		>
			<div className="flex items-center justify-between mb-2">
				<span className="text-sm font-semibold text-[--text-primary]">
					{ROLE_LABELS[agent.role] ?? agent.role}
					{agent.isBlocked && (
						<span className="ml-1.5 text-red-400" data-testid="blocked-indicator">
							blocked
						</span>
					)}
				</span>
				<span className="flex items-center gap-1.5 text-xs font-medium text-[--text-secondary]">
					<span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
					{agent.status}
					{isHighSigma && agent.status === "COMPLETED" && (
						<span
							className="animate-badge-pop inline-block text-emerald-400"
							data-testid="verified-badge"
						>
							{"\u2713"}
						</span>
					)}
				</span>
			</div>

			{/* Sigma complexity bar */}
			<div className="mb-2" data-testid="sigma-bar">
				<div className="flex justify-between text-[10px] text-[--text-muted] mb-0.5">
					<span>{"\u03C3"} complexity</span>
					<span className="font-mono">{agent.sigmaValue.toFixed(2)}</span>
				</div>
				<div className="w-full h-1 bg-[--bg-tertiary] rounded-full overflow-hidden">
					<div
						className={`h-full rounded-full transition-all duration-500 ${
							isHighSigma ? "bg-amber-500" : "bg-blue-500"
						}`}
						style={{ width: `${sigmaPercent}%` }}
					/>
				</div>
			</div>

			<div className="space-y-0.5 text-xs text-[--text-secondary]">
				<div className="flex justify-between">
					<span>Task</span>
					<span className="font-mono">{agent.taskId ?? "\u2014"}</span>
				</div>
				<div className="flex justify-between">
					<span>Model</span>
					<span className="font-mono">{agent.model}</span>
				</div>
				<div className="flex justify-between">
					<span>Tokens</span>
					<span className="font-mono">{agent.tokensUsed.toLocaleString()}</span>
				</div>
				<div className="flex justify-between">
					<span>Cost</span>
					<span className="font-mono">${agent.costIncurred.toFixed(4)}</span>
				</div>
			</div>
		</div>
	);
}
