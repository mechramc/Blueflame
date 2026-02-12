"use client";

import { type AgentCardData, AgentStatusCard } from "./AgentStatusCard";

interface AgentGridProps {
	agents: AgentCardData[];
	justAuthorized?: boolean;
	newReinforcementIds?: string[];
}

/**
 * Grid of agent status cards. Updates in real-time via SignalR.
 * Supports staggered spawn animation on authorization and slide-in for reinforcements.
 */
export function AgentGrid({
	agents,
	justAuthorized = false,
	newReinforcementIds = [],
}: AgentGridProps) {
	if (agents.length === 0) {
		return (
			<div className="text-[--text-muted] text-sm p-4" data-testid="agent-grid-empty">
				No agents spawned yet
			</div>
		);
	}

	return (
		<div
			className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
			data-testid="agent-grid"
		>
			{agents.map((agent, index) => {
				const isReinforcement = newReinforcementIds.includes(agent.agentId);
				let animClass = "";
				if (isReinforcement) {
					animClass = "animate-reinforcement-arrive";
				} else if (justAuthorized) {
					animClass = "animate-spawn-agent";
				}

				return (
					<div
						key={agent.agentId}
						className={animClass}
						style={
							justAuthorized && !isReinforcement ? { animationDelay: `${index * 80}ms` } : undefined
						}
					>
						<AgentStatusCard agent={agent} />
					</div>
				);
			})}
		</div>
	);
}
