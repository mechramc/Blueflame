"use client";

import { useState } from "react";

import type { AgentCardData } from "./AgentStatusCard";

interface AzureServiceUsagePanelProps {
	agents: AgentCardData[];
	taskCount: number;
	currentSpend: number;
}

interface ServiceUsage {
	name: string;
	icon: string;
	calls: number;
	detail: string;
	color: string;
}

export function AzureServiceUsagePanel({
	agents,
	taskCount,
	currentSpend,
}: AzureServiceUsagePanelProps) {
	const [expanded, setExpanded] = useState(true);

	const completedAgents = agents.filter(
		(a) => a.status === "COMPLETED" || a.status === "FAILED",
	).length;
	const totalTokens = agents.reduce((sum, a) => sum + a.tokensUsed, 0);

	const services: ServiceUsage[] = [
		{
			name: "Azure OpenAI",
			icon: "AI",
			calls: completedAgents,
			detail: `${totalTokens.toLocaleString()} tokens across ${agents.length} agents`,
			color: "blue",
		},
		{
			name: "Azure Cosmos DB",
			icon: "DB",
			calls: taskCount * 3 + agents.length,
			detail: `${taskCount} task outputs + ${agents.length} agent states persisted`,
			color: "emerald",
		},
		{
			name: "Azure SignalR",
			icon: "RT",
			calls: agents.length * 4,
			detail: `~${agents.length * 4} real-time status events pushed`,
			color: "amber",
		},
		{
			name: "Microsoft Entra ID",
			icon: "ID",
			calls: 1,
			detail: "RBAC authorization for run execution",
			color: "purple",
		},
		{
			name: "App Insights",
			icon: "AP",
			calls: completedAgents + taskCount,
			detail: `${completedAgents + taskCount} telemetry events traced`,
			color: "blue",
		},
	];

	const totalCalls = services.reduce((sum, s) => sum + s.calls, 0);

	return (
		<div className="rounded border border-[--border] bg-[--bg-secondary] overflow-hidden">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center justify-between px-3 py-2 hover:bg-[--bg-tertiary]/50 transition-colors"
			>
				<div className="flex items-center gap-2">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-blue-400">
						<rect x="1" y="1" width="10" height="10" rx="1" fill="currentColor" fillOpacity="0.8" />
						<rect
							x="13"
							y="1"
							width="10"
							height="10"
							rx="1"
							fill="currentColor"
							fillOpacity="0.6"
						/>
						<rect
							x="1"
							y="13"
							width="10"
							height="10"
							rx="1"
							fill="currentColor"
							fillOpacity="0.6"
						/>
						<rect
							x="13"
							y="13"
							width="10"
							height="10"
							rx="1"
							fill="currentColor"
							fillOpacity="0.4"
						/>
					</svg>
					<span className="text-xs font-semibold text-[--text-primary]">Azure Service Usage</span>
					<span className="text-[10px] text-[--text-muted] font-mono">
						{totalCalls} calls | ${currentSpend.toFixed(4)}
					</span>
				</div>
				<span className="text-[10px] text-[--text-muted]">{expanded ? "\u25B2" : "\u25BC"}</span>
			</button>

			{expanded && (
				<div className="border-t border-[--border] px-3 py-2 space-y-1.5">
					{services.map((svc) => (
						<div key={svc.name} className="flex items-center gap-2">
							<div
								className={`w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold shrink-0 ${
									svc.color === "emerald"
										? "bg-emerald-500/20 text-emerald-400"
										: svc.color === "purple"
											? "bg-purple-500/20 text-purple-400"
											: svc.color === "amber"
												? "bg-amber-500/20 text-amber-400"
												: "bg-blue-500/20 text-blue-400"
								}`}
							>
								{svc.icon}
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center justify-between">
									<span className="text-[10px] font-medium text-[--text-secondary]">
										{svc.name}
									</span>
									<span className="text-[10px] font-mono text-[--text-muted]">{svc.calls}x</span>
								</div>
								<div className="text-[9px] text-[--text-muted] truncate">{svc.detail}</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
