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
}

interface RemediationPlanViewProps {
	remediation: RemediationViewData | null;
	onAuthorize?: () => void;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
	PENDING: { bg: "bg-gray-100", text: "text-gray-700", label: "Pending" },
	ANALYZING: { bg: "bg-blue-100", text: "text-blue-700", label: "Analyzing" },
	PLAN_READY: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Plan Ready" },
	AUTHORIZED: { bg: "bg-green-100", text: "text-green-700", label: "Authorized" },
	EXECUTING: { bg: "bg-indigo-100", text: "text-indigo-700", label: "Executing" },
	COMPLETED: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Completed" },
	FAILED: { bg: "bg-red-100", text: "text-red-700", label: "Failed" },
};

/**
 * Shows remediation lifecycle state: status badge, parent lock link,
 * remediation lock link, and authorize button when in PLAN_READY state.
 */
export function RemediationPlanView({ remediation, onAuthorize }: RemediationPlanViewProps) {
	if (!remediation) {
		return (
			<div className="text-sm text-gray-500 italic p-4" data-testid="no-remediation">
				No remediation in progress
			</div>
		);
	}

	const DEFAULT_STATUS = { bg: "bg-gray-100", text: "text-gray-700", label: "Pending" };
	const statusStyle = STATUS_STYLES[remediation.status] ?? DEFAULT_STATUS;
	const showAuthorize = remediation.status === "PLAN_READY" && onAuthorize;

	return (
		<div className="space-y-3" data-testid="remediation-view">
			{/* Status header */}
			<div className="flex items-center justify-between">
				<h4 className="text-sm font-semibold text-gray-900">Remediation</h4>
				<span
					className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}
					data-testid="remediation-status"
				>
					{statusStyle.label}
				</span>
			</div>

			{/* Details */}
			<div className="space-y-1.5 text-xs text-gray-600">
				<div className="flex justify-between">
					<span>ID:</span>
					<span className="font-mono">{remediation.remediationId}</span>
				</div>
				<div className="flex justify-between">
					<span>Parent Lock:</span>
					<span className="font-mono">{remediation.parentLockId}</span>
				</div>
				{remediation.remediationLockId && (
					<div className="flex justify-between">
						<span>Remediation Lock:</span>
						<span className="font-mono">{remediation.remediationLockId}</span>
					</div>
				)}
				<div className="flex justify-between">
					<span>Created:</span>
					<span>{new Date(remediation.createdAt).toLocaleString()}</span>
				</div>
				<div className="flex justify-between">
					<span>Updated:</span>
					<span>{new Date(remediation.updatedAt).toLocaleString()}</span>
				</div>
			</div>

			{/* Authorize button */}
			{showAuthorize && (
				<button
					type="button"
					onClick={onAuthorize}
					className="w-full py-2 px-3 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors animate-pulse-glow"
					data-testid="authorize-remediation-btn"
				>
					Authorize Remediation Plan
				</button>
			)}
		</div>
	);
}
