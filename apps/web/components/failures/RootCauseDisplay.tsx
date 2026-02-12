"use client";

import type { RootCauseAnalysis } from "@blueflame/shared";

interface RootCauseDisplayProps {
	rootCause: RootCauseAnalysis | null;
}

function confidenceColor(c: number): string {
	if (c >= 0.9) return "text-emerald-400";
	if (c >= 0.7) return "text-yellow-400";
	if (c >= 0.5) return "text-orange-400";
	return "text-red-400";
}

function confidenceLabel(c: number): string {
	if (c >= 0.9) return "High";
	if (c >= 0.7) return "Medium";
	if (c >= 0.5) return "Low";
	return "Very Low";
}

export function RootCauseDisplay({ rootCause }: RootCauseDisplayProps) {
	if (!rootCause) {
		return (
			<div className="text-sm text-[--text-muted] italic p-4" data-testid="no-root-cause">
				Root cause analysis not yet available
			</div>
		);
	}

	const confPercent = Math.round(rootCause.confidence * 100);

	return (
		<div className="space-y-4" data-testid="root-cause-display">
			{/* Summary */}
			<div>
				<h4 className="text-xs font-semibold uppercase text-[--text-muted] mb-1">Summary</h4>
				<p className="text-sm text-[--text-primary]" data-testid="rca-summary">
					{rootCause.summary}
				</p>
			</div>

			{/* Confidence */}
			<div>
				<div className="flex items-center justify-between mb-1">
					<h4 className="text-xs font-semibold uppercase text-[--text-muted]">Confidence</h4>
					<span
						className={`text-sm font-semibold ${confidenceColor(rootCause.confidence)}`}
						data-testid="rca-confidence"
					>
						{confPercent}% — {confidenceLabel(rootCause.confidence)}
					</span>
				</div>
				<div className="w-full h-1 bg-[--bg-tertiary] rounded-full overflow-hidden">
					<div
						className={`h-full rounded-full transition-all duration-500 ${
							rootCause.confidence >= 0.7
								? "bg-emerald-500"
								: rootCause.confidence >= 0.5
									? "bg-yellow-500"
									: "bg-red-500"
						}`}
						style={{ width: `${confPercent}%` }}
					/>
				</div>
			</div>

			{/* Root Cause Detail */}
			<div>
				<h4 className="text-xs font-semibold uppercase text-[--text-muted] mb-1">Root Cause</h4>
				<div
					className="text-sm text-[--text-primary] bg-[--bg-primary] rounded border border-[--border] p-3 font-mono text-xs leading-relaxed"
					data-testid="rca-detail"
				>
					{rootCause.rootCause}
				</div>
			</div>

			{/* Affected Files */}
			{rootCause.affectedFiles.length > 0 && (
				<div>
					<h4 className="text-xs font-semibold uppercase text-[--text-muted] mb-1">
						Affected Files ({rootCause.affectedFiles.length})
					</h4>
					<ul className="space-y-0.5" data-testid="affected-files">
						{rootCause.affectedFiles.map((f) => (
							<li
								key={f}
								className="text-xs font-mono text-[--text-secondary] bg-[--bg-tertiary] px-2 py-1 rounded"
							>
								{f}
							</li>
						))}
					</ul>
				</div>
			)}

			{/* Remediation Tasks */}
			{rootCause.remediationTasks.length > 0 && (
				<div>
					<h4 className="text-xs font-semibold uppercase text-[--text-muted] mb-1">
						Remediation Tasks ({rootCause.remediationTasks.length})
					</h4>
					<div className="space-y-2" data-testid="remediation-tasks">
						{rootCause.remediationTasks.map((t) => (
							<div
								key={t.id}
								className="text-sm bg-[--bg-secondary] border border-[--border] rounded p-2"
							>
								<div className="flex items-center justify-between mb-1">
									<span className="font-mono text-xs text-[--text-muted]">{t.id}</span>
									<span className="text-[10px] font-medium font-mono text-[--text-muted]">
										{"\u03C3"}
										{t.estimatedSigma} · ${t.estimatedCost.toFixed(2)} · {t.agentRole}
									</span>
								</div>
								<p className="text-[--text-secondary]">{t.description}</p>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
