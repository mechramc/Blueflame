"use client";

/**
 * Spec Delta Impact Map — color-coded task impact visualization.
 *
 * Displays the result of spec delta analysis with PRESERVE/REBUILD/NEW/REMOVE
 * classifications per task, and a re-authorize button for affected plans.
 *
 * Source: Blueflame-Spec-v3-ACAR.md Section 17 (WF6 Delta Detection)
 */

/** Impact classification matching the API delta-detection module */
export type TaskImpact = "PRESERVE" | "REBUILD" | "NEW" | "REMOVE";

/** Task impact entry for display */
export interface TaskImpactDisplay {
	taskId: string;
	impact: TaskImpact;
	reason: string;
	changeCount: number;
}

/** Delta summary counts */
export interface DeltaSummary {
	preserve: number;
	rebuild: number;
	new: number;
	remove: number;
	totalChanges: number;
}

interface DeltaImpactMapProps {
	oldSpecId: string;
	newSpecId: string;
	taskImpacts: TaskImpactDisplay[];
	summary: DeltaSummary;
	onReauthorize?: () => void;
}

const IMPACT_STYLES: Record<TaskImpact, { bg: string; text: string; label: string }> = {
	PRESERVE: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Preserve" },
	REBUILD: { bg: "bg-amber-500/10", text: "text-amber-400", label: "Rebuild" },
	NEW: { bg: "bg-blue-500/10", text: "text-blue-400", label: "New" },
	REMOVE: { bg: "bg-red-500/10", text: "text-red-400", label: "Remove" },
};

function SummaryBadge({ label, count, color }: { label: string; count: number; color: string }) {
	return (
		<div className={`flex items-center gap-2 px-3 py-1.5 rounded ${color}`}>
			<span className="text-xs font-medium">{label}</span>
			<span className="text-sm font-bold font-mono">{count}</span>
		</div>
	);
}

export function DeltaImpactMap({
	oldSpecId,
	newSpecId,
	taskImpacts,
	summary,
	onReauthorize,
}: DeltaImpactMapProps) {
	const needsReauth = summary.rebuild > 0 || summary.new > 0 || summary.remove > 0;

	return (
		<div
			className="rounded border border-[--border] bg-[--bg-primary]"
			data-testid="delta-impact-map"
		>
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-[--border] bg-[--bg-secondary]">
				<div>
					<h3 className="text-sm font-semibold text-[--text-primary]">Spec Delta Impact</h3>
					<p className="text-xs text-[--text-muted] mt-0.5">
						{oldSpecId} {"\u2192"} {newSpecId} — {summary.totalChanges} change
						{summary.totalChanges !== 1 ? "s" : ""} detected
					</p>
				</div>
				{needsReauth && onReauthorize && (
					<button
						type="button"
						onClick={onReauthorize}
						className="px-4 py-1.5 text-xs font-medium bg-[--accent] text-white rounded hover:opacity-90 transition-opacity"
						data-testid="reauthorize-btn"
					>
						Re-authorize Plan
					</button>
				)}
			</div>

			{/* Summary badges */}
			<div className="flex gap-2 px-4 py-3 border-b border-[--border]" data-testid="delta-summary">
				<SummaryBadge
					label="Preserve"
					count={summary.preserve}
					color="bg-emerald-500/10 text-emerald-400"
				/>
				<SummaryBadge
					label="Rebuild"
					count={summary.rebuild}
					color="bg-amber-500/10 text-amber-400"
				/>
				<SummaryBadge label="New" count={summary.new} color="bg-blue-500/10 text-blue-400" />
				<SummaryBadge label="Remove" count={summary.remove} color="bg-red-500/10 text-red-400" />
			</div>

			{/* Task list */}
			<div className="divide-y divide-[--border]/30">
				{taskImpacts.length === 0 ? (
					<div className="px-4 py-6 text-center text-sm text-[--text-muted]">
						No changes detected between spec versions
					</div>
				) : (
					taskImpacts.map((task) => {
						const style = IMPACT_STYLES[task.impact];
						return (
							<div
								key={task.taskId}
								className={`flex items-center gap-3 px-4 py-2.5 ${style.bg}`}
								data-testid={`impact-task-${task.taskId}`}
							>
								<span
									className={`inline-block w-16 text-center text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${style.text} bg-[--bg-primary]/50`}
								>
									{style.label}
								</span>

								<span className="text-sm font-mono text-[--text-primary] min-w-[80px]">
									{task.taskId}
								</span>

								<span className="text-xs text-[--text-secondary] flex-1 truncate">
									{task.reason}
								</span>

								{task.changeCount > 0 && (
									<span className="text-[10px] text-[--text-muted] font-mono">
										{task.changeCount} change{task.changeCount !== 1 ? "s" : ""}
									</span>
								)}
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
