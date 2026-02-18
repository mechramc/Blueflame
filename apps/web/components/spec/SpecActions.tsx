"use client";

import { useAzureToast } from "@/components/layout/AzureToastProvider";
import { apiGet, apiPost } from "@/lib/api-client";
import { SpecStatus } from "@blueflame/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ExecutionStep =
	| "idle"
	| "generating"
	| "planned"
	| "locking"
	| "locked"
	| "starting"
	| "running"
	| "completed";

interface RunSummary {
	runId: string;
	status: string;
	specId: string;
	createdAt: string;
	startedAt: string | null;
	endedAt: string | null;
}

interface SpecActionsProps {
	status: SpecStatus;
	projectId: string;
	specId: string | null;
	onAccept: () => void;
	onFreeze: () => void;
	onGenerateSpec: () => void;
	onRunIdChange?: (runId: string | null) => void;
	disabled?: boolean;
}

export function SpecActions({
	status,
	projectId,
	specId,
	onAccept,
	onFreeze,
	onGenerateSpec,
	onRunIdChange,
	disabled = false,
}: SpecActionsProps) {
	const router = useRouter();
	const { showToast } = useAzureToast();
	const [execStep, setExecStep] = useState<ExecutionStep>("idle");
	const [runId, setRunId] = useState<string | null>(null);
	const [launchError, setLaunchError] = useState<string | null>(null);
	const [latestRun, setLatestRun] = useState<RunSummary | null>(null);
	const [loadingState, setLoadingState] = useState(true);

	// On mount: check for existing runs for this spec
	// biome-ignore lint/correctness/useExhaustiveDependencies: onRunIdChange is a stable parent callback
	useEffect(() => {
		if (!specId || status !== SpecStatus.Frozen) {
			setLoadingState(false);
			return;
		}

		async function checkExistingRuns() {
			try {
				const data = await apiGet<{ runs: RunSummary[] }>(`/api/projects/${projectId}/runs`);
				// Find the latest run for this spec
				const runsForSpec = data.runs.filter((r) => r.specId === specId);
				const latest = runsForSpec[0];
				if (latest) {
					setLatestRun(latest);
					setRunId(latest.runId);
					onRunIdChange?.(latest.runId);

					const s = latest.status;
					if (s === "COMPLETED") {
						setExecStep("completed");
					} else if (s === "PARTIAL" || s === "FAILED") {
						setExecStep("completed");
					} else if (s === "EXECUTING" || s === "PAUSED") {
						setExecStep("running");
					} else if (s === "AUTHORIZED") {
						setExecStep("locked");
					} else {
						// PENDING — plan generated but not locked
						setExecStep("planned");
					}
				}
			} catch {
				// API unavailable — stay in idle
			} finally {
				setLoadingState(false);
			}
		}
		checkExistingRuns();
	}, [specId, projectId, status]);

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
			showToast("Azure OpenAI", "AI", "Plan generated via GPT-4o", "blue");
			setTimeout(
				() => showToast("Azure Cosmos DB", "DB", "Plan persisted to Cosmos DB", "emerald"),
				800,
			);
			setExecStep("planned");
			onRunIdChange?.(newRunId);
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
			showToast("Microsoft Entra ID", "ID", "Execution authorized via RBAC", "purple");
			setTimeout(() => showToast("Azure Cosmos DB", "DB", "Plan lock persisted", "emerald"), 600);
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
			showToast("Azure OpenAI", "AI", "Agents dispatched via Azure OpenAI", "blue");
			setTimeout(
				() => showToast("Azure SignalR", "RT", "Real-time monitoring active", "amber"),
				500,
			);
			router.push(`/project/${projectId}/run/${runId}`);
		} catch (err) {
			console.error("[SpecActions] Execution error:", err);
			setLaunchError(err instanceof Error ? err.message : "Failed to start execution");
			setExecStep("locked");
		}
	};

	const handleNewRun = useCallback(() => {
		setExecStep("idle");
		setRunId(null);
		setLatestRun(null);
		setLaunchError(null);
		onRunIdChange?.(null);
	}, [onRunIdChange]);

	const handleViewRun = useCallback(() => {
		if (runId) {
			router.push(`/project/${projectId}/run/${runId}`);
		}
	}, [runId, projectId, router]);

	if (loadingState) {
		return (
			<div className="flex items-center gap-2">
				<span className="text-xs text-[--text-muted] animate-pulse">Loading...</span>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2">
			{status === SpecStatus.Draft && (
				<>
					<button
						onClick={onGenerateSpec}
						disabled={disabled}
						type="button"
						data-testid="spec-actions-generate-button"
						className="rounded border border-[--border-bright] px-3 py-1 text-xs font-medium text-[--text-secondary] transition-colors hover:bg-[--bg-tertiary] hover:text-[--text-primary] disabled:opacity-50"
					>
						{specId ? "Regenerate" : "Generate"}
					</button>
					{specId && (
						<button
							onClick={onAccept}
							disabled={disabled}
							type="button"
							data-testid="spec-actions-accept-button"
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
					data-testid="spec-actions-freeze-button"
					className="rounded border border-emerald-500 px-3 py-1 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10 disabled:opacity-50"
				>
					Freeze
				</button>
			)}
			{status === SpecStatus.Frozen && (
				<div className="flex items-center gap-2">
					<span className="text-xs text-emerald-400">Frozen</span>

					{/* Existing run — show status + actions */}
					{(execStep === "running" || execStep === "completed") && latestRun && (
						<>
							<span
								className={`text-xs px-1.5 py-0.5 rounded font-medium ${
									latestRun.status === "COMPLETED"
										? "bg-emerald-500/20 text-emerald-400"
										: latestRun.status === "PARTIAL" || latestRun.status === "FAILED"
											? "bg-red-500/20 text-red-400"
											: "bg-blue-500/20 text-blue-400"
								}`}
							>
								{latestRun.status}
							</span>
							<button
								onClick={handleViewRun}
								type="button"
								className="rounded bg-[--accent] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-600"
							>
								View Run
							</button>
							<button
								onClick={handleNewRun}
								type="button"
								className="rounded border border-[--border] px-3 py-1.5 text-xs text-[--text-muted] hover:bg-[--bg-tertiary]"
							>
								New Run
							</button>
						</>
					)}

					{/* Step 1: Generate Plan */}
					{execStep === "idle" && (
						<button
							onClick={handleGeneratePlan}
							disabled={!specId}
							type="button"
							data-testid="spec-actions-generate-plan-button"
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
								data-testid="spec-actions-approve-lock-button"
								className="rounded bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
							>
								Approve &amp; Lock
							</button>
							<button
								onClick={handleNewRun}
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
								data-testid="spec-actions-start-execution-button"
								className="rounded bg-[--accent] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
							>
								Start Execution
							</button>
							<button
								onClick={handleNewRun}
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
