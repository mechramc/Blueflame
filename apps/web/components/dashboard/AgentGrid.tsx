"use client";

import { type AgentCardData, AgentStatusCard } from "./AgentStatusCard";

interface AgentGridProps {
	agents: AgentCardData[];
}

/**
 * Grid of agent status cards. Updates in real-time via SignalR.
 */
export function AgentGrid({ agents }: AgentGridProps) {
	if (agents.length === 0) {
		return (
			<div className="text-gray-400 text-sm p-4" data-testid="agent-grid-empty">
				No agents spawned yet
			</div>
		);
	}

	return (
		<div
			className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
			data-testid="agent-grid"
		>
			{agents.map((agent) => (
				<AgentStatusCard key={agent.agentId} agent={agent} />
			))}
		</div>
	);
}
