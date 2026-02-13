"use client";

import type { PendingFix } from "@blueflame/shared";

interface FixerDiffViewProps {
	fix: PendingFix;
	onApprove: (taskId: string) => void;
	onReject: (taskId: string) => void;
}

export function FixerDiffView({ fix, onApprove, onReject }: FixerDiffViewProps) {
	return (
		<div className="rounded border border-amber-500/30 bg-amber-500/5 p-4">
			<div className="flex items-center justify-between mb-3">
				<div>
					<h4 className="text-sm font-semibold text-[--text-primary]">
						Fix Proposed for Task {fix.taskId}
					</h4>
					<p className="text-xs text-[--text-muted] mt-0.5">
						Retry {fix.retryCount}/3 — Fixer: {fix.fixerId}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => onReject(fix.taskId)}
						className="rounded border border-red-500/40 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
					>
						Reject Fix
					</button>
					<button
						type="button"
						onClick={() => onApprove(fix.taskId)}
						className="rounded border border-emerald-500/40 px-3 py-1 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10"
					>
						Approve Fix & Re-run
					</button>
				</div>
			</div>

			{/* Explanation */}
			{fix.explanation && (
				<div className="mb-3 rounded bg-[--bg-secondary] border border-[--border] p-2">
					<div className="text-[10px] text-[--text-muted] mb-1 font-medium uppercase">
						Explanation
					</div>
					<p className="text-xs text-[--text-secondary]">{fix.explanation}</p>
				</div>
			)}

			{/* Side-by-side diff */}
			<div className="grid grid-cols-2 gap-2">
				{/* Original */}
				<div>
					<div className="text-[10px] text-red-400 font-medium mb-1 uppercase">
						Original (Failed)
					</div>
					<pre className="rounded bg-[--bg-secondary] border border-red-500/20 p-2 text-[11px] text-[--text-secondary] font-mono overflow-x-auto max-h-48 overflow-y-auto">
						{fix.originalCode || "(no code captured)"}
					</pre>
				</div>

				{/* Fixed */}
				<div>
					<div className="text-[10px] text-emerald-400 font-medium mb-1 uppercase">
						Proposed Fix
					</div>
					<pre className="rounded bg-[--bg-secondary] border border-emerald-500/20 p-2 text-[11px] text-[--text-secondary] font-mono overflow-x-auto max-h-48 overflow-y-auto">
						{fix.fixedCode || "(fix in progress...)"}
					</pre>
				</div>
			</div>
		</div>
	);
}
