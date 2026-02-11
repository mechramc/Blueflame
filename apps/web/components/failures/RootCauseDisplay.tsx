"use client";

import type { RootCauseAnalysis } from "@blueflame/shared";

interface RootCauseDisplayProps {
	rootCause: RootCauseAnalysis | null;
}

function confidenceColor(c: number): string {
	if (c >= 0.9) return "text-green-600";
	if (c >= 0.7) return "text-yellow-600";
	if (c >= 0.5) return "text-orange-600";
	return "text-red-600";
}

function confidenceLabel(c: number): string {
	if (c >= 0.9) return "High";
	if (c >= 0.7) return "Medium";
	if (c >= 0.5) return "Low";
	return "Very Low";
}

/**
 * Displays Fixer agent root cause analysis: summary, detailed explanation,
 * confidence gauge, affected files.
 */
export function RootCauseDisplay({ rootCause }: RootCauseDisplayProps) {
	if (!rootCause) {
		return (
			<div className="text-sm text-gray-500 italic p-4" data-testid="no-root-cause">
				Root cause analysis not yet available
			</div>
		);
	}

	const confPercent = Math.round(rootCause.confidence * 100);

	return (
		<div className="space-y-4" data-testid="root-cause-display">
			{/* Summary */}
			<div>
				<h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Summary</h4>
				<p className="text-sm text-gray-900" data-testid="rca-summary">
					{rootCause.summary}
				</p>
			</div>

			{/* Confidence */}
			<div>
				<div className="flex items-center justify-between mb-1">
					<h4 className="text-xs font-semibold uppercase text-gray-500">Confidence</h4>
					<span
						className={`text-sm font-semibold ${confidenceColor(rootCause.confidence)}`}
						data-testid="rca-confidence"
					>
						{confPercent}% — {confidenceLabel(rootCause.confidence)}
					</span>
				</div>
				<div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
					<div
						className={`h-full rounded-full transition-all duration-500 ${
							rootCause.confidence >= 0.7
								? "bg-green-500"
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
				<h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Root Cause</h4>
				<div
					className="text-sm text-gray-700 bg-gray-50 rounded-md p-3 border"
					data-testid="rca-detail"
				>
					{rootCause.rootCause}
				</div>
			</div>

			{/* Affected Files */}
			{rootCause.affectedFiles.length > 0 && (
				<div>
					<h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">
						Affected Files ({rootCause.affectedFiles.length})
					</h4>
					<ul className="space-y-1" data-testid="affected-files">
						{rootCause.affectedFiles.map((f) => (
							<li key={f} className="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded">
								{f}
							</li>
						))}
					</ul>
				</div>
			)}

			{/* Remediation Tasks */}
			{rootCause.remediationTasks.length > 0 && (
				<div>
					<h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">
						Remediation Tasks ({rootCause.remediationTasks.length})
					</h4>
					<div className="space-y-2" data-testid="remediation-tasks">
						{rootCause.remediationTasks.map((t) => (
							<div key={t.id} className="text-sm bg-white border rounded-md p-2">
								<div className="flex items-center justify-between mb-1">
									<span className="font-mono text-xs text-gray-500">{t.id}</span>
									<span className="text-[10px] font-medium text-gray-500">
										σ{t.estimatedSigma} · ${t.estimatedCost.toFixed(2)} · {t.agentRole}
									</span>
								</div>
								<p className="text-gray-700">{t.description}</p>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
