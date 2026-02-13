"use client";

import { useEffect, useState } from "react";

const ACTIVITY_PHRASES = [
	"Analyzing spec constraints...",
	"Orchestrating agent swarm...",
	"Routing through σ-pipeline...",
	"Evaluating dependency graph...",
	"Spawning builder agents...",
	"Verifying compliance gates...",
	"Computing cost projections...",
	"Resolving task dependencies...",
	"Marshalling build artifacts...",
	"Calibrating model selection...",
	"Cross-referencing constraints...",
	"Preparing verification harness...",
	"Synthesizing execution plan...",
	"Negotiating resource allocation...",
	"Validating governance policies...",
	"Harmonizing agent outputs...",
];

interface ExecutionActivityBannerProps {
	status: string;
	taskCount: number;
	runningCount: number;
	completedCount: number;
}

export function ExecutionActivityBanner({
	status,
	taskCount,
	runningCount,
	completedCount,
}: ExecutionActivityBannerProps) {
	const [phraseIndex, setPhraseIndex] = useState(0);

	useEffect(() => {
		if (status !== "EXECUTING") return;
		const interval = setInterval(() => {
			setPhraseIndex((prev) => (prev + 1) % ACTIVITY_PHRASES.length);
		}, 2500);
		return () => clearInterval(interval);
	}, [status]);

	if (status === "COMPLETED") {
		return (
			<div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3">
				<span className="text-emerald-400 text-lg">&#10003;</span>
				<div>
					<span className="text-sm font-semibold text-emerald-400">Run Complete</span>
					<span className="text-xs text-[--text-muted] ml-2">
						{completedCount}/{taskCount} tasks completed
					</span>
				</div>
			</div>
		);
	}

	if (status === "PARTIAL") {
		return (
			<div className="rounded border border-amber-500/30 bg-amber-500/10 p-4 flex items-center gap-3">
				<span className="text-amber-400 text-lg">&#9888;</span>
				<div>
					<span className="text-sm font-semibold text-amber-400">Partial Completion</span>
					<span className="text-xs text-[--text-muted] ml-2">
						{completedCount}/{taskCount} tasks completed — some failed
					</span>
				</div>
			</div>
		);
	}

	if (status === "PAUSED") {
		return (
			<div className="rounded border border-yellow-500/30 bg-yellow-500/10 p-4 flex items-center gap-3 animate-pulse">
				<span className="text-yellow-400 text-lg">&#9208;</span>
				<div>
					<span className="text-sm font-semibold text-yellow-400">Paused</span>
					<span className="text-xs text-[--text-muted] ml-2">Awaiting budget decision</span>
				</div>
			</div>
		);
	}

	if (status === "PENDING" || status === "AUTHORIZED") {
		return (
			<div className="rounded border border-[--border] bg-[--bg-secondary] p-4 flex items-center gap-3">
				<div className="relative h-5 w-5 shrink-0">
					<div className="absolute inset-0 rounded-full border-2 border-[--text-muted]/30" />
				</div>
				<span className="text-sm text-[--text-secondary]">Waiting to start execution...</span>
			</div>
		);
	}

	// EXECUTING state — the fun one
	return (
		<div className="rounded border border-blue-500/30 bg-blue-500/5 p-4">
			<div className="flex items-center gap-3">
				{/* Animated spinner */}
				<div className="relative h-5 w-5 shrink-0">
					<div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
					<div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400 animate-spin" />
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<span className="text-sm font-semibold text-blue-400">Executing</span>
						<span className="text-xs text-[--text-muted] font-mono">
							{runningCount} running &middot; {completedCount}/{taskCount} done
						</span>
					</div>
					<p className="text-xs text-[--text-secondary] mt-0.5 truncate transition-opacity duration-300">
						{ACTIVITY_PHRASES[phraseIndex]}
					</p>
				</div>
				{/* Progress dots */}
				<div className="flex gap-1 shrink-0">
					{Array.from({ length: Math.min(taskCount, 8) }, (_, i) => (
						<div
							key={`dot-${
								// biome-ignore lint/suspicious/noArrayIndexKey: fixed-size progress dots
								i
							}`}
							className={`h-2 w-2 rounded-full transition-colors duration-300 ${
								i < completedCount
									? "bg-emerald-400"
									: i < completedCount + runningCount
										? "bg-blue-400 animate-pulse"
										: "bg-[--bg-tertiary]"
							}`}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
