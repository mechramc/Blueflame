"use client";

/**
 * SCR Panel — Spec Change Request governance UI.
 *
 * When a spec is frozen, this panel replaces the disabled chat input.
 * Provides the formal SCR workflow:
 *   1. Request change (inline editor + reason)
 *   2. View DiffPack + Impact Map
 *   3. Approve / Reject
 *   4. Execute Delta (navigate to run dashboard)
 */

import type { DiffPackItem, SpecChangeRequest, TaskPatchEntry } from "@blueflame/shared";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { apiPost, apiPut } from "../../lib/api-client";
import { DeltaImpactMap, type DeltaSummary, type TaskImpactDisplay } from "./DeltaImpactMap";

interface SCRPanelProps {
	projectId: string;
	frozenSpecId: string;
	frozenContent: string;
}

type SCRStep = "idle" | "editing" | "reviewing" | "approved" | "executing";

const SEVERITY_STYLES: Record<string, { bg: string; text: string }> = {
	PATCH: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
	MINOR: { bg: "bg-blue-500/10", text: "text-blue-400" },
	MAJOR: { bg: "bg-red-500/10", text: "text-red-400" },
};

export function SCRPanel({ projectId, frozenSpecId, frozenContent }: SCRPanelProps) {
	const router = useRouter();
	const [step, setStep] = useState<SCRStep>("idle");
	const [editedContent, setEditedContent] = useState(frozenContent);
	const [reason, setReason] = useState("");
	const [scr, setSCR] = useState<SpecChangeRequest | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleStartEdit = useCallback(() => {
		setEditedContent(frozenContent);
		setReason("");
		setError(null);
		setStep("editing");
	}, [frozenContent]);

	const handleSubmitSCR = useCallback(async () => {
		if (!reason.trim()) {
			setError("A reason is required for spec changes.");
			return;
		}
		if (editedContent === frozenContent) {
			setError("No changes detected — modify the spec before submitting.");
			return;
		}

		setLoading(true);
		setError(null);
		try {
			const result = await apiPost<{ scr: SpecChangeRequest }>("/api/scr", {
				projectId,
				frozenSpecId,
				newContent: editedContent,
				reason,
			});
			setSCR(result.scr);
			setStep("reviewing");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create SCR");
		} finally {
			setLoading(false);
		}
	}, [projectId, frozenSpecId, editedContent, frozenContent, reason]);

	const handleApprove = useCallback(async () => {
		if (!scr) return;
		setLoading(true);
		setError(null);
		try {
			const result = await apiPut<{ scr: SpecChangeRequest }>(`/api/scr/${scr.id}/approve`, {});
			setSCR(result.scr);
			setStep("approved");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to approve SCR");
		} finally {
			setLoading(false);
		}
	}, [scr]);

	const handleReject = useCallback(async () => {
		if (!scr) return;
		setLoading(true);
		setError(null);
		try {
			await apiPut(`/api/scr/${scr.id}/reject`, { reason: "Rejected by user" });
			setSCR(null);
			setStep("idle");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to reject SCR");
		} finally {
			setLoading(false);
		}
	}, [scr]);

	const handleExecuteDelta = useCallback(async () => {
		if (!scr) return;
		setLoading(true);
		setError(null);
		try {
			const result = await apiPost<{ runId: string }>(`/api/scr/${scr.id}/execute`);
			setStep("executing");
			router.push(`/project/${projectId}/run/${result.runId}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to execute delta run");
		} finally {
			setLoading(false);
		}
	}, [scr, projectId, router]);

	const handleCancel = useCallback(() => {
		setStep("idle");
		setSCR(null);
		setError(null);
	}, []);

	return (
		<div className="border-t border-[--border] bg-[--bg-primary]">
			{error && (
				<div className="px-4 py-2 text-xs text-red-400 bg-red-500/10 border-b border-red-500/20">
					{error}
				</div>
			)}

			{step === "idle" && <IdleView onStartEdit={handleStartEdit} />}

			{step === "editing" && (
				<EditingView
					editedContent={editedContent}
					reason={reason}
					loading={loading}
					onContentChange={setEditedContent}
					onReasonChange={setReason}
					onSubmit={handleSubmitSCR}
					onCancel={handleCancel}
				/>
			)}

			{step === "reviewing" && scr && (
				<ReviewingView
					scr={scr}
					loading={loading}
					onApprove={handleApprove}
					onReject={handleReject}
					onCancel={handleCancel}
				/>
			)}

			{step === "approved" && scr && (
				<ApprovedView
					scr={scr}
					loading={loading}
					onExecute={handleExecuteDelta}
					onCancel={handleCancel}
				/>
			)}

			{step === "executing" && (
				<div className="px-4 py-3 text-center">
					<p className="text-xs text-[--text-muted]">
						Delta execution started. Redirecting to run dashboard...
					</p>
				</div>
			)}
		</div>
	);
}

// ─── Sub-views ───────────────────────────────────────────────

function IdleView({ onStartEdit }: { onStartEdit: () => void }) {
	return (
		<div className="px-4 py-3 flex items-center justify-between">
			<p className="text-xs text-[--text-muted]">
				Spec is frozen. Changes require a formal Spec Change Request.
			</p>
			<button
				type="button"
				onClick={onStartEdit}
				className="px-3 py-1.5 text-xs font-medium rounded bg-[--accent] text-white hover:opacity-90 transition-opacity shrink-0"
			>
				Request Change
			</button>
		</div>
	);
}

function EditingView({
	editedContent,
	reason,
	loading,
	onContentChange,
	onReasonChange,
	onSubmit,
	onCancel,
}: {
	editedContent: string;
	reason: string;
	loading: boolean;
	onContentChange: (v: string) => void;
	onReasonChange: (v: string) => void;
	onSubmit: () => void;
	onCancel: () => void;
}) {
	return (
		<div className="p-4 space-y-3">
			<label className="block">
				<span className="text-xs font-medium text-[--text-secondary] block mb-1">
					Reason for change (required)
				</span>
				<input
					type="text"
					value={reason}
					onChange={(e) => onReasonChange(e.target.value)}
					placeholder="Why is this change needed?"
					className="w-full px-3 py-1.5 text-xs bg-[--bg-secondary] border border-[--border] rounded text-[--text-primary] placeholder:text-[--text-muted]"
				/>
			</label>
			<label className="block">
				<span className="text-xs font-medium text-[--text-secondary] block mb-1">
					Modified spec content
				</span>
				<textarea
					value={editedContent}
					onChange={(e) => onContentChange(e.target.value)}
					rows={8}
					className="w-full px-3 py-2 text-xs font-mono bg-[--bg-secondary] border border-[--border] rounded text-[--text-primary] resize-y"
				/>
			</label>
			<div className="flex gap-2 justify-end">
				<button
					type="button"
					onClick={onCancel}
					className="px-3 py-1.5 text-xs font-medium rounded border border-[--border] text-[--text-secondary] hover:bg-[--bg-tertiary]"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={onSubmit}
					disabled={loading}
					className="px-3 py-1.5 text-xs font-medium rounded bg-[--accent] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
				>
					{loading ? "Analyzing..." : "Submit SCR"}
				</button>
			</div>
		</div>
	);
}

function ReviewingView({
	scr,
	loading,
	onApprove,
	onReject,
	onCancel,
}: {
	scr: SpecChangeRequest;
	loading: boolean;
	onApprove: () => void;
	onReject: () => void;
	onCancel: () => void;
}) {
	const sevStyle = SEVERITY_STYLES[scr.severity] ?? {
		bg: "bg-emerald-500/10",
		text: "text-emerald-400",
	};
	const diffItems = scr.diffPack.items;

	// Build impact display from diff items
	const taskImpacts: TaskImpactDisplay[] = diffItems.map((item) => ({
		taskId: item.id,
		impact: mapChangeTypeToImpact(item.changeType),
		reason: `${item.changeType}: ${item.path}`,
		changeCount: 1,
	}));

	const summary: DeltaSummary = {
		preserve: 0,
		rebuild: diffItems.filter(
			(d) => d.changeType.includes("MODIFIED") || d.changeType.includes("REMOVED"),
		).length,
		new: diffItems.filter((d) => d.changeType.includes("ADDED")).length,
		remove: diffItems.filter((d) => d.changeType === "CRITERION_REMOVED").length,
		totalChanges: diffItems.length,
	};

	return (
		<div className="p-4 space-y-3">
			{/* SCR Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="text-xs font-mono text-[--text-muted]">{scr.id}</span>
					<span
						className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${sevStyle.bg} ${sevStyle.text}`}
					>
						{scr.severity}
					</span>
				</div>
				<span className="text-xs text-[--text-muted]">
					{scr.diffPack.items.length} change{scr.diffPack.items.length !== 1 ? "s" : ""}
				</span>
			</div>

			{/* Reason */}
			<div className="text-xs text-[--text-secondary] bg-[--bg-secondary] rounded px-3 py-2">
				<span className="font-medium text-[--text-primary]">Reason:</span> {scr.reason}
			</div>

			{/* DiffPack */}
			<DiffPackViewer items={scr.diffPack.items} />

			{/* Impact Map */}
			<DeltaImpactMap
				oldSpecId={scr.frozenSpecId}
				newSpecId={scr.newSpecId}
				taskImpacts={taskImpacts}
				summary={summary}
			/>

			{/* Actions */}
			<div className="flex gap-2 justify-end pt-1">
				<button
					type="button"
					onClick={onCancel}
					className="px-3 py-1.5 text-xs font-medium rounded border border-[--border] text-[--text-secondary] hover:bg-[--bg-tertiary]"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={onReject}
					disabled={loading}
					className="px-3 py-1.5 text-xs font-medium rounded border border-red-500/50 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
				>
					Reject
				</button>
				<button
					type="button"
					onClick={onApprove}
					disabled={loading}
					className="px-3 py-1.5 text-xs font-medium rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
				>
					{loading ? "Approving..." : "Approve SCR"}
				</button>
			</div>
		</div>
	);
}

function ApprovedView({
	scr,
	loading,
	onExecute,
	onCancel,
}: {
	scr: SpecChangeRequest;
	loading: boolean;
	onExecute: () => void;
	onCancel: () => void;
}) {
	const patch = scr.taskPatch;

	return (
		<div className="p-4 space-y-3">
			<div className="flex items-center gap-2">
				<span className="text-xs font-mono text-[--text-muted]">{scr.id}</span>
				<span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
					APPROVED
				</span>
			</div>

			{/* TaskPatch summary */}
			{patch && (
				<div className="bg-[--bg-secondary] rounded border border-[--border] p-3 space-y-2">
					<h4 className="text-xs font-semibold text-[--text-primary]">Task Patch</h4>
					<div className="grid grid-cols-2 gap-2 text-xs">
						<PatchStat
							label="Invalidate"
							count={patch.invalidateTasks.length}
							color="text-amber-400"
						/>
						<PatchStat label="Add" count={patch.addTasks.length} color="text-blue-400" />
						<PatchStat label="Cancel" count={patch.cancelTasks.length} color="text-red-400" />
						<PatchStat label="Update" count={patch.updateTasks.length} color="text-purple-400" />
					</div>
					{patch.invalidateTasks.length > 0 && (
						<div className="mt-2 space-y-1">
							<p className="text-[10px] font-medium text-[--text-muted] uppercase">
								Tasks to re-execute:
							</p>
							{patch.invalidateTasks.map((entry: TaskPatchEntry) => (
								<div key={entry.taskId} className="text-xs text-amber-400 font-mono">
									{entry.taskId} — {entry.reason}
								</div>
							))}
						</div>
					)}
				</div>
			)}

			<div className="flex gap-2 justify-end pt-1">
				<button
					type="button"
					onClick={onCancel}
					className="px-3 py-1.5 text-xs font-medium rounded border border-[--border] text-[--text-secondary] hover:bg-[--bg-tertiary]"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={onExecute}
					disabled={loading}
					className="px-4 py-1.5 text-xs font-medium rounded bg-[--accent] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
				>
					{loading ? "Starting..." : "Execute Delta"}
				</button>
			</div>
		</div>
	);
}

// ─── Helpers ─────────────────────────────────────────────────

function DiffPackViewer({ items }: { items: DiffPackItem[] }) {
	if (items.length === 0) return null;

	return (
		<div className="bg-[--bg-secondary] rounded border border-[--border] divide-y divide-[--border]/30">
			<div className="px-3 py-2">
				<h4 className="text-xs font-semibold text-[--text-primary]">DiffPack</h4>
			</div>
			{items.map((item) => (
				<div key={item.id} className="px-3 py-2 flex items-start gap-2 text-xs">
					<span className="font-mono text-[--text-muted] shrink-0 w-16">{item.id}</span>
					<span className="font-mono text-[--text-secondary] shrink-0 w-40 truncate">
						{item.path}
					</span>
					<div className="flex-1 min-w-0">
						{item.oldValue && <div className="text-red-400/70 truncate">- {item.oldValue}</div>}
						{item.newValue && <div className="text-emerald-400/70 truncate">+ {item.newValue}</div>}
					</div>
				</div>
			))}
		</div>
	);
}

function PatchStat({ label, count, color }: { label: string; count: number; color: string }) {
	return (
		<div className="flex items-center gap-1.5">
			<span className={`font-mono font-bold ${color}`}>{count}</span>
			<span className="text-[--text-muted]">{label}</span>
		</div>
	);
}

function mapChangeTypeToImpact(changeType: string): "PRESERVE" | "REBUILD" | "NEW" | "REMOVE" {
	if (changeType.includes("ADDED")) return "NEW";
	if (changeType.includes("REMOVED")) return "REMOVE";
	if (changeType.includes("MODIFIED")) return "REBUILD";
	return "PRESERVE";
}
