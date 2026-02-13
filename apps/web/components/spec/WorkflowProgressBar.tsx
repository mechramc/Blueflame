"use client";

import { SpecStatus } from "@blueflame/shared";

interface WorkflowProgressBarProps {
	status: SpecStatus;
}

const STEPS = [
	{ key: "draft", label: "Drafting", matchStatus: SpecStatus.Draft },
	{ key: "review", label: "Human Review", matchStatus: SpecStatus.Accepted },
	{ key: "frozen", label: "Frozen", matchStatus: SpecStatus.Frozen },
] as const;

function getActiveIndex(status: SpecStatus): number {
	switch (status) {
		case SpecStatus.Draft:
			return 0;
		case SpecStatus.Accepted:
			return 1;
		case SpecStatus.Frozen:
			return 2;
		default:
			return 0;
	}
}

export function WorkflowProgressBar({ status }: WorkflowProgressBarProps) {
	const activeIndex = getActiveIndex(status);

	return (
		<div className="flex items-center gap-1 px-2 py-3">
			{STEPS.map((step, idx) => {
				const isComplete = idx < activeIndex;
				const isActive = idx === activeIndex;

				return (
					<div key={step.key} className="flex items-center gap-1 flex-1">
						{/* Step indicator */}
						<div className="flex items-center gap-1.5 flex-1">
							<div
								className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
									isComplete
										? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
										: isActive
											? "bg-[--accent]/20 text-[--accent] border border-[--accent]/40"
											: "bg-[--bg-tertiary] text-[--text-muted] border border-[--border]"
								}`}
							>
								{isComplete ? "✓" : idx + 1}
							</div>
							<span
								className={`text-[10px] truncate ${
									isActive
										? "text-[--text-primary] font-semibold"
										: isComplete
											? "text-emerald-400"
											: "text-[--text-muted]"
								}`}
							>
								{step.label}
							</span>
						</div>

						{/* Connector line */}
						{idx < STEPS.length - 1 && (
							<div
								className={`h-px flex-1 min-w-4 ${
									isComplete ? "bg-emerald-500/40" : "bg-[--border]"
								}`}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}
