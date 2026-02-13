"use client";

import { apiPost } from "@/lib/api-client";
import { SpecStatus } from "@blueflame/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ExecutionStep = "idle" | "generating" | "planned" | "locking" | "locked" | "starting";

interface SpecActionsProps {
	status: SpecStatus;
	projectId: string;
	specId: string | null;
	onAccept: () => void;
	onFreeze: () => void;
	onGenerateSpec: () => void;
	disabled?: boolean;
}

export function SpecActions({
	status,
	projectId,
	specId,
	onAccept,
	onFreeze,
	onGenerateSpec,
	disabled = false,
}: SpecActionsProps) {
	const router = useRouter();
	const [execStep, setExecStep] = useState<ExecutionStep>("idle");
	const [runId, setRunId] = useState<string | null>(null);
	const [launchError, setLaunchError] = useState<string | null>(null);

	const handleGeneratePlan = async () => {
		if (!specId) return;
		setExecStep("generating");
		setLaunchError(null);

		const newRunId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		setRunId(newRunId);

		try {
			await apiPost("/api/plans/generate", {
				specId,
				runId: newRunId,
				projectId,
			});
			setExecStep("planned");
		} catch (err) {
			console.error("[SpecActions] Plan generation error:", err);
			setLaunchError(err instanceof Error ? err.message : "Failed to generate plan");
			setExecStep("idle");
		}
	};

	const handleApproveLock = async () => {
		if (!runId) return;
		setExecStep("locking");
		setLaunchError(null);

		try {
			await apiPost("/api/authorize", {
				runId,
				budgetCeiling: 50,
			});
			setExecStep("locked");
		} catch (err) {
			console.error("[SpecActions] Lock error:", err);
			setLaunchError(err instanceof Error ? err.message : "Failed to approve & lock plan");
			setExecStep("planned");
		}
	};

	const handleStartExecution = async () => {
		if (!runId) return;
		setExecStep("starting");
		setLaunchError(null);

		try {
			await apiPost("/api/execution/start", { runId });
			router.push(`/project/${projectId}/run/${runId}`);
		} catch (err) {
			console.error("[SpecActions] Execution error:", err);
			setLaunchError(err instanceof Error ? err.message : "Failed to start execution");
			setExecStep("locked");
		}
	};

	const handleReset = () => {
		setExecStep("idle");
		setRunId(null);
		setLaunchError(null);
	};

	return (
		<div className="flex items-center gap-2">
			{status === SpecStatus.Draft && (
				<>
					<button
						onClick={onGenerateSpec}
						disabled={disabled}
						type="button"
						className="rounded border border-[--border-bright] px-3 py-1 text-xs font-medium text-[--text-secondary] transition-colors hover:bg-[--bg-tertiary] hover:text-[--text-primary] disabled:opacity-50"
					>
						{specId ? "Regenerate" : "Generate"}
					</button>
					{specId && (
						<button
							onClick={onAccept}
							disabled={disabled}
							type="button"
							className="rounded border border-[--accent] px-3 py-1 text-xs font-medium text-blue-400 transition-colors hover:bg-[--accent]/10 disabled:opacity-50"
						>
							Accept
						</button>
					)}
				</>
			)}
			{status === SpecStatus.Accepted && (
				<button
					onClick={onFreeze}
					disabled={disabled}
					type="button"
					className="rounded border border-emerald-500 px-3 py-1 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10 disabled:opacity-50"
				>
					Freeze
				</button>
			)}
			{status === SpecStatus.Frozen && (
				<div className="flex items-center gap-2">
					<span className="text-xs text-emerald-400">Frozen</span>

					{/* Step 1: Generate Plan */}
					{execStep === "idle" && (
						<button
							onClick={handleGeneratePlan}
							disabled={!specId}
							type="button"
							className="rounded bg-[--accent] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
						>
							Generate Plan
						</button>
					)}

					{execStep === "generating" && (
						<span className="text-xs text-[--text-muted] animate-pulse">Generating plan...</span>
					)}

					{/* Step 2: Approve & Lock */}
					{execStep === "planned" && (
						<>
							<span className="text-xs text-blue-400">Plan ready</span>
							<button
								onClick={handleApproveLock}
								type="button"
								className="rounded bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
							>
								Approve &amp; Lock
							</button>
							<button
								onClick={handleReset}
								type="button"
								className="rounded border border-[--border] px-3 py-1.5 text-xs text-[--text-muted] hover:bg-[--bg-tertiary]"
							>
								Cancel
							</button>
						</>
					)}

					{execStep === "locking" && (
						<span className="text-xs text-[--text-muted] animate-pulse">Locking plan...</span>
					)}

					{/* Step 3: Start Execution */}
					{execStep === "locked" && (
						<>
							<span className="text-xs text-emerald-400">Locked</span>
							<button
								onClick={handleStartExecution}
								type="button"
								className="rounded bg-[--accent] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
							>
								Start Execution
							</button>
							<button
								onClick={handleReset}
								type="button"
								className="rounded border border-[--border] px-3 py-1.5 text-xs text-[--text-muted] hover:bg-[--bg-tertiary]"
							>
								Cancel
							</button>
						</>
					)}

					{execStep === "starting" && (
						<span className="text-xs text-[--text-muted] animate-pulse">Starting execution...</span>
					)}

					{launchError && <span className="text-xs text-red-400">{launchError}</span>}
				</div>
			)}
		</div>
	);
}
