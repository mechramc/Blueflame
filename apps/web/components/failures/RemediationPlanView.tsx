"use client";

import type { RemediationStatus } from "@blueflame/shared";

export interface RemediationViewData {
	remediationId: string;
	status: RemediationStatus | string;
	failureId: string;
	parentLockId: string;
	remediationLockId: string | null;
	createdAt: string;
	updatedAt: string;
	resolvedVia?: "override" | "fixer" | null;
	resolvedBy?: string;
	runId?: string;
}

interface RemediationPlanViewProps {
	remediation: RemediationViewData | null;
	onAuthorize?: () => void;
	onExecute?: () => void;
}

const STATUS_STYLES: Record<string, { dot: string; text: string; label: string }> = {
	PENDING: { dot: "bg-[--text-muted]", text: "text-[--text-muted]", label: "Pending" },
	ANALYZING: { dot: "bg-blue-400", text: "text-blue-400", label: "Analyzing" },
	PLAN_READY: { dot: "bg-yellow-400", text: "text-yellow-400", label: "Plan Ready" },
	AUTHORIZED: { dot: "bg-emerald-400", text: "text-emerald-400", label: "Authorized" },
	EXECUTING: { dot: "bg-indigo-400", text: "text-indigo-400", label: "Executing" },
	COMPLETED: { dot: "bg-emerald-400", text: "text-emerald-400", label: "Completed" },
	FAILED: { dot: "bg-red-400", text: "text-red-400", label: "Failed" },
	OVERRIDDEN: { dot: "bg-amber-400", text: "text-amber-400", label: "Overridden (Admin)" },
};

export function RemediationPlanView({
	remediation,
	onAuthorize,
	onExecute,
}: RemediationPlanViewProps) {
	if (!remediation) {
		return (
			<div className="text-sm text-[--text-muted] italic p-4" data-testid="no-remediation">
				No remediation in progress
			</div>
		);
	}

	const DEFAULT_STATUS = {
		dot: "bg-[--text-muted]",
		text: "text-[--text-muted]",
		label: "Pending",
	};
	const statusStyle = STATUS_STYLES[remediation.status] ?? DEFAULT_STATUS;
	const showAuthorize = remediation.status === "PLAN_READY" && onAuthorize;
	const isOverridden = remediation.status === "OVERRIDDEN";
	const isResolved = isOverridden || remediation.status === "COMPLETED";

	return (
		<div className="space-y-3" data-testid="remediation-view">
			{/* Status header */}
			<div className="flex items-center justify-between">
				<h4 className="text-sm font-semibold text-[--text-primary]">Remediation</h4>
				<span
					className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusStyle.text}`}
					data-testid="remediation-status"
				>
					<span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
					{statusStyle.label}
				</span>
			</div>

			{/* Details */}
			<div className="space-y-1 text-xs text-[--text-secondary]">
				<div className="flex justify-between">
					<span>ID</span>
					<span className="font-mono">{remediation.remediationId}</span>
				</div>
				<div className="flex justify-between">
					<span>Parent Lock</span>
					<span className="font-mono">{remediation.parentLockId}</span>
				</div>
				{remediation.remediationLockId && (
					<div className="flex justify-between">
						<span>Remediation Lock</span>
						<span className="font-mono">{remediation.remediationLockId}</span>
					</div>
				)}
				<div className="flex justify-between">
					<span>Created</span>
					<span className="font-mono">{new Date(remediation.createdAt).toLocaleString()}</span>
				</div>
				<div className="flex justify-between">
					<span>Updated</span>
					<span className="font-mono">{new Date(remediation.updatedAt).toLocaleString()}</span>
				</div>
			</div>

			{/* Resolved via admin override — static badge */}
			{isOverridden && (
				<div
					className="w-full py-2 px-3 text-sm font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded text-center"
					data-testid="override-badge"
				>
					Resolved via admin override
					{remediation.resolvedBy && (
						<span className="text-xs text-amber-400/70 ml-1">by {remediation.resolvedBy}</span>
					)}
				</div>
			)}

			{/* Resolved via fixer — static badge */}
			{remediation.status === "COMPLETED" && remediation.resolvedVia === "fixer" && (
				<div
					className="w-full py-2 px-3 text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded text-center"
					data-testid="fixer-resolved-badge"
				>
					Resolved via automated fixer
				</div>
			)}

			{/* Authorize button + View Run link for PLAN_READY */}
			{showAuthorize && (
				<div className="space-y-2">
					<button
						type="button"
						onClick={onAuthorize}
						className="w-full py-2 px-3 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors animate-pulse-glow"
						data-testid="authorize-remediation-btn"
					>
						Authorize Remediation Plan
					</button>
					{remediation.runId && (
						<a
							href={`/project/${remediation.runId.split("-").slice(0, 1).join("")}/runs`}
							className="block w-full py-2 px-3 text-sm font-medium text-[--accent] bg-[--accent]/10 border border-[--accent]/30 rounded text-center hover:bg-[--accent]/20 transition-colors"
							data-testid="view-run-link"
						>
							View Run
						</a>
					)}
				</div>
			)}

			{/* Execute button — shown after authorization */}
			{!isResolved && remediation.status === "AUTHORIZED" && onExecute && (
				<button
					type="button"
					onClick={onExecute}
					className="w-full py-2 px-3 text-sm font-semibold text-white bg-[--accent] hover:bg-blue-500 rounded transition-colors"
					data-testid="execute-remediation-btn"
				>
					Execute Remediation
				</button>
			)}
		</div>
	);
}
