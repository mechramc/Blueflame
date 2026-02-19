"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiGet, apiPost } from "@/lib/api-client";
import type { DeploymentState } from "@blueflame/shared";

interface WorkflowRunInfo {
	id: number;
	name: string;
	status: string;
	conclusion: string | null;
	htmlUrl: string;
	createdAt: string;
}

interface CIStatusResponse {
	step: DeploymentState["step"];
	workflowRuns: WorkflowRunInfo[];
}

interface CIStatusPanelProps {
	runId: string;
	deploymentState: DeploymentState;
	onDeploymentUpdate: () => void;
}

export function CIStatusPanel({ runId, deploymentState, onDeploymentUpdate }: CIStatusPanelProps) {
	const [workflowRuns, setWorkflowRuns] = useState<WorkflowRunInfo[]>([]);
	const [deploying, setDeploying] = useState(false);
	const [deployError, setDeployError] = useState<string | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const isTerminal =
		deploymentState.step === "ci_passed" ||
		deploymentState.step === "ci_failed" ||
		deploymentState.step === "deployed";

	const pollCI = useCallback(async () => {
		try {
			const data = await apiGet<CIStatusResponse>(`/api/deployment/${runId}/ci-status`);
			setWorkflowRuns(data.workflowRuns);
			onDeploymentUpdate();
		} catch {
			// Silently handle poll errors
		}
	}, [runId, onDeploymentUpdate]);

	useEffect(() => {
		pollCI();

		if (!isTerminal) {
			intervalRef.current = setInterval(pollCI, 3000);
		}

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [pollCI, isTerminal]);

	const [markingDeployed, setMarkingDeployed] = useState(false);

	const handleDeploy = async () => {
		setDeploying(true);
		setDeployError(null);
		try {
			await apiPost(`/api/deployment/${runId}/deploy`);
			onDeploymentUpdate();
		} catch (err) {
			setDeployError(err instanceof Error ? err.message : "Deploy failed");
		} finally {
			setDeploying(false);
		}
	};

	const handleMarkDeployed = async () => {
		setMarkingDeployed(true);
		setDeployError(null);
		try {
			await apiPost(`/api/deployment/${runId}/mark-deployed`);
			onDeploymentUpdate();
		} catch (err) {
			setDeployError(err instanceof Error ? err.message : "Failed to mark as deployed");
		} finally {
			setMarkingDeployed(false);
		}
	};

	const stepBadge = () => {
		switch (deploymentState.step) {
			case "synced":
				return (
					<span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
						Waiting for CI
					</span>
				);
			case "ci_running":
				return (
					<span className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
						<span className="h-2 w-2 animate-spin rounded-full border border-blue-400/30 border-t-blue-400" />
						CI Running
					</span>
				);
			case "ci_passed":
				return (
					<span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
						CI Passed
					</span>
				);
			case "ci_failed":
				return (
					<span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">CI Failed</span>
				);
			case "deployed":
				return (
					<span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
						Deployed
					</span>
				);
			default:
				return null;
		}
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold text-[--text-primary]">CI / CD Pipeline</h3>
				{stepBadge()}
			</div>

			{/* PR link */}
			{deploymentState.prUrl && (
				<div className="flex items-center gap-2 text-xs">
					<span className="text-[--text-muted]">PR:</span>
					<a
						href={deploymentState.prUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="text-[--accent] hover:underline font-mono"
					>
						#{deploymentState.prNumber}
					</a>
					<span className="text-[--text-muted]">on branch</span>
					<span className="text-[--text-secondary] font-mono">{deploymentState.branchName}</span>
				</div>
			)}

			{/* Workflow runs */}
			{workflowRuns.length > 0 && (
				<div className="space-y-1.5">
					{workflowRuns.slice(0, 3).map((wr) => (
						<div
							key={wr.id}
							className="flex items-center justify-between rounded border border-[--border] bg-[--bg-primary] px-3 py-2"
						>
							<div className="flex items-center gap-2">
								{wr.status === "in_progress" || wr.status === "queued" ? (
									<span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-400" />
								) : wr.conclusion === "success" ? (
									<span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
								) : (
									<span className="h-2.5 w-2.5 rounded-full bg-red-400" />
								)}
								<span className="text-xs text-[--text-primary]">{wr.name || "Workflow"}</span>
							</div>
							<a
								href={wr.htmlUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-xs text-[--accent] hover:underline"
							>
								View
							</a>
						</div>
					))}
				</div>
			)}

			{workflowRuns.length === 0 &&
				(deploymentState.step === "synced" || deploymentState.step === "ci_running") && (
					<div className="flex items-center gap-2 text-xs text-[--text-muted]">
						<span className="h-3 w-3 animate-spin rounded-full border-2 border-[--text-muted]/30 border-t-[--text-muted]" />
						Waiting for CI workflows to appear...
					</div>
				)}

			{/* Deploy button */}
			{deploymentState.step === "ci_passed" && (
				<div className="pt-2 border-t border-[--border]">
					{deployError && (
						<div className="rounded border border-red-500/30 bg-red-500/5 px-3 py-2 mb-2">
							<p className="text-xs text-red-400">{deployError}</p>
						</div>
					)}
					<button
						type="button"
						onClick={handleDeploy}
						disabled={deploying}
						className="w-full rounded border border-emerald-500/50 bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
					>
						{deploying ? (
							<span className="flex items-center justify-center gap-2">
								<span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
								Deploying...
							</span>
						) : (
							"Deploy to Production"
						)}
					</button>
					<button
						type="button"
						onClick={handleMarkDeployed}
						disabled={markingDeployed}
						className="w-full text-center text-xs text-[--text-muted] hover:text-[--text-secondary] mt-2 disabled:opacity-50"
					>
						{markingDeployed ? "Marking..." : "Already deployed externally? Mark as deployed"}
					</button>
				</div>
			)}

			{/* Deployed success */}
			{deploymentState.step === "deployed" && (
				<div className="rounded border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
					<p className="text-sm font-medium text-emerald-400">Deployed successfully</p>
					{deploymentState.deployedAt && (
						<p className="text-xs text-[--text-muted] mt-1">
							{new Date(deploymentState.deployedAt).toLocaleString()}
						</p>
					)}
				</div>
			)}

			{/* CI failed */}
			{deploymentState.step === "ci_failed" && (
				<div className="rounded border border-red-500/30 bg-red-500/5 px-4 py-3">
					<p className="text-sm font-medium text-red-400">CI checks failed</p>
					<p className="text-xs text-[--text-muted] mt-1">
						Review the workflow runs above to diagnose the failure.
					</p>
				</div>
			)}
		</div>
	);
}
