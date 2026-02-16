"use client";

import type { PendingFix } from "@blueflame/shared";

interface FixerDiffViewProps {
	fix: PendingFix;
	onApprove: (taskId: string) => void;
	onReject: (taskId: string) => void;
}

export function FixerDiffView({ fix, onApprove, onReject }: FixerDiffViewProps) {
	const isFixPending = !fix.fixedCode;

	return (
		<div className="rounded border border-amber-500/30 bg-amber-500/5 p-4">
			<div className="flex items-center justify-between mb-3">
				<div>
					<h4 className="text-sm font-semibold text-[--text-primary]">
						{isFixPending ? "Fixer Working on" : "Fix Proposed for"} Task {fix.taskId}
					</h4>
					<p className="text-xs text-[--text-muted] mt-0.5">
						Retry {fix.retryCount}/3 — Fixer: {fix.fixerId}
					</p>
				</div>
				{!isFixPending && (
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
				)}
				{isFixPending && (
					<span className="flex items-center gap-2 text-xs text-amber-400">
						<span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
						Fixer agent is working...
					</span>
				)}
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
					{isFixPending ? (
						<div className="rounded bg-[--bg-secondary] border border-emerald-500/20 p-2 max-h-48 overflow-hidden space-y-2">
							<div className="h-3 w-3/4 rounded bg-[--text-muted]/20 animate-pulse" />
							<div className="h-3 w-full rounded bg-[--text-muted]/20 animate-pulse" />
							<div className="h-3 w-5/6 rounded bg-[--text-muted]/20 animate-pulse" />
							<div className="h-3 w-2/3 rounded bg-[--text-muted]/20 animate-pulse" />
							<div className="h-3 w-4/5 rounded bg-[--text-muted]/20 animate-pulse" />
						</div>
					) : (
						<pre className="rounded bg-[--bg-secondary] border border-emerald-500/20 p-2 text-[11px] text-[--text-secondary] font-mono overflow-x-auto max-h-48 overflow-y-auto">
							{fix.fixedCode}
						</pre>
					)}
				</div>
			</div>
		</div>
	);
}
