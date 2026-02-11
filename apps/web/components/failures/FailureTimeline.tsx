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
	timeout: "bg-gray-500",
	infrastructure: "bg-blue-500",
};

/**
 * Vertical timeline showing CI/CD failures in chronological order.
 * Each entry shows type badge, build number, branch, and remediation status.
 */
export function FailureTimeline({ failures, onSelect, selectedId }: FailureTimelineProps) {
	if (failures.length === 0) {
		return (
			<div className="text-sm text-gray-500 italic p-4" data-testid="no-failures">
				No failures recorded
			</div>
		);
	}

	return (
		<div className="space-y-0" data-testid="failure-timeline">
			{failures.map((f, i) => {
				const isSelected = f.failureId === selectedId;
				const isLast = i === failures.length - 1;
				const dotColor = TYPE_COLORS[f.failureType] ?? "bg-gray-400";

				return (
					<button
						key={f.failureId}
						type="button"
						onClick={() => onSelect(f.failureId)}
						className={`w-full text-left flex gap-3 p-3 transition-colors rounded-r-md ${
							isSelected
								? "bg-blue-50 border-l-2 border-blue-500"
								: "hover:bg-gray-50 border-l-2 border-transparent"
						}`}
						data-testid={`failure-entry-${f.failureId}`}
					>
						{/* Timeline dot + line */}
						<div className="flex flex-col items-center">
							<div className={`w-3 h-3 rounded-full ${dotColor} shrink-0 mt-0.5`} />
							{!isLast && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
						</div>

						{/* Content */}
						<div className="flex-1 min-w-0">
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-gray-900">Build #{f.buildNumber}</span>
								<span
									className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded text-white ${dotColor}`}
								>
									{f.failureType}
								</span>
							</div>
							<div className="text-xs text-gray-500 mt-0.5 truncate">
								{f.branchRef.replace("refs/heads/", "")}
							</div>
							<div className="flex items-center justify-between mt-1">
								<span className="text-[10px] text-gray-400">
									{new Date(f.timestamp).toLocaleString()}
								</span>
								{f.hasRemediation && (
									<span
										className="text-[10px] text-green-600 font-medium"
										data-testid="remediation-badge"
									>
										Remediated
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
