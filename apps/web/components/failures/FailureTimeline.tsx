"use client";

import type { FailureType } from "@blueflame/shared";

export interface FailureTimelineEntry {
	failureId: string;
	failureType: FailureType | string;
	buildNumber: string;
	source: string;
	timestamp: string;
	branchRef: string;
	hasRemediation: boolean;
	remediationStatus?: string;
}

interface FailureTimelineProps {
	failures: FailureTimelineEntry[];
	onSelect: (failureId: string) => void;
	selectedId?: string;
}

const TYPE_COLORS: Record<string, string> = {
	test: "bg-red-500",
	build: "bg-orange-500",
	lint: "bg-yellow-500",
	deploy: "bg-purple-500",
	timeout: "bg-[--text-muted]",
	infrastructure: "bg-blue-500",
};

export function FailureTimeline({ failures, onSelect, selectedId }: FailureTimelineProps) {
	if (failures.length === 0) {
		return (
			<div className="text-sm text-[--text-muted] italic p-4" data-testid="no-failures">
				No failures recorded
			</div>
		);
	}

	return (
		<div className="space-y-0" data-testid="failure-timeline">
			{failures.map((f, i) => {
				const isSelected = f.failureId === selectedId;
				const isLast = i === failures.length - 1;
				const dotColor = TYPE_COLORS[f.failureType] ?? "bg-[--text-muted]";

				return (
					<button
						key={f.failureId}
						type="button"
						onClick={() => onSelect(f.failureId)}
						className={`w-full text-left flex gap-3 p-2.5 transition-colors rounded-r-md ${
							isSelected
								? "bg-[--accent]/10 border-l-2 border-[--accent]"
								: "hover:bg-[--bg-tertiary] border-l-2 border-transparent"
						}`}
						data-testid={`failure-entry-${f.failureId}`}
					>
						{/* Timeline dot + line */}
						<div className="flex flex-col items-center">
							<div className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0 mt-0.5`} />
							{!isLast && <div className="w-px flex-1 bg-[--border] mt-1" />}
						</div>

						{/* Content */}
						<div className="flex-1 min-w-0">
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-[--text-primary]">
									Build <span className="font-mono">#{f.buildNumber}</span>
								</span>
								<span
									className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded text-white ${dotColor}`}
								>
									{f.failureType}
								</span>
							</div>
							<div className="text-xs text-[--text-muted] mt-0.5 truncate font-mono">
								{f.branchRef.replace("refs/heads/", "")}
							</div>
							<div className="flex items-center justify-between mt-1">
								<span className="text-[10px] text-[--text-muted] font-mono">
									{new Date(f.timestamp).toLocaleString()}
								</span>
								{f.hasRemediation && (
									<span
										className={`text-[10px] font-medium ${
											f.remediationStatus === "OVERRIDDEN" ? "text-amber-400" : "text-emerald-400"
										}`}
										data-testid="remediation-badge"
									>
										{f.remediationStatus === "OVERRIDDEN" ? "Overridden" : "Remediated"}
									</span>
								)}
							</div>
						</div>
					</button>
				);
			})}
		</div>
	);
}
