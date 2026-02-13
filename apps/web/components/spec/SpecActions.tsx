"use client";

import { apiPost } from "@/lib/api-client";
import { SpecStatus } from "@blueflame/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
	const [isLaunching, setIsLaunching] = useState(false);
	const [launchError, setLaunchError] = useState<string | null>(null);

	const handleLaunchExecution = async () => {
		if (!specId) return;
		setIsLaunching(true);
		setLaunchError(null);

		const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

		try {
			// Step 1: Generate plan from frozen spec
			await apiPost("/api/plans/generate", {
				specId,
				runId,
				projectId,
			});

			// Step 2: Authorize the plan (default budget ceiling $50)
			await apiPost("/api/authorize", {
				runId,
				budgetCeiling: 50,
			});

			// Step 3: Start execution
			await apiPost("/api/execution/start", { runId });

			// Navigate to the run dashboard
			router.push(`/project/${projectId}/run/${runId}`);
		} catch (err) {
			console.error("[SpecActions] Launch error:", err);
			setLaunchError(err instanceof Error ? err.message : "Failed to launch execution");
			setIsLaunching(false);
		}
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
					<button
						onClick={handleLaunchExecution}
						disabled={isLaunching}
						type="button"
						className="rounded bg-[--accent] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
					>
						{isLaunching ? "Launching..." : "Generate Plan & Execute"}
					</button>
					{launchError && <span className="text-xs text-red-400">{launchError}</span>}
				</div>
			)}
		</div>
	);
}
