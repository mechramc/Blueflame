"use client";

import { useCallback, useState } from "react";

import type { TaskOutput } from "@/components/dashboard/FileTreePane";
import { apiPost } from "@/lib/api-client";
import type { DeploymentState } from "@blueflame/shared";

import { CIStatusPanel } from "./CIStatusPanel";
import { GitHubSyncSection } from "./GitHubSyncSection";

interface PostRunActionsPanelProps {
	runId: string;
	taskOutputs: Record<string, TaskOutput>;
	deploymentState: DeploymentState | null;
	onRefresh: () => void;
}

export function PostRunActionsPanel({
	runId,
	taskOutputs,
	deploymentState,
	onRefresh,
}: PostRunActionsPanelProps) {
	const [githubNotConfigured, setGithubNotConfigured] = useState(false);

	const step = deploymentState?.step ?? "idle";
	const hasFiles = Object.values(taskOutputs).some((o) => o.files && o.files.length > 0);

	const handleSync = useCallback(
		async (commitMessage: string) => {
			try {
				await apiPost(`/api/deployment/${runId}/sync`, { commitMessage });
				onRefresh();
			} catch (err) {
				if (err instanceof Error && err.message.includes("not configured")) {
					setGithubNotConfigured(true);
				}
				throw err;
			}
		},
		[runId, onRefresh],
	);

	// GitHub not configured fallback
	if (githubNotConfigured) {
		return (
			<div className="border-t border-[--border] bg-[--bg-secondary] px-6 py-4">
				<div className="rounded border border-blue-500/30 bg-blue-500/5 px-4 py-3">
					<h3 className="text-sm font-semibold text-blue-400 mb-2">
						GitHub Integration Not Configured
					</h3>
					<p className="text-xs text-[--text-secondary] mb-2">
						Set the following environment variables to enable deployment:
					</p>
					<ul className="text-xs text-[--text-muted] font-mono space-y-1">
						<li>GITHUB_OWNER</li>
						<li>GITHUB_REPO</li>
						<li>GITHUB_APP_ID</li>
						<li>GITHUB_PRIVATE_KEY</li>
						<li>GITHUB_INSTALLATION_ID</li>
					</ul>
					{hasFiles && (
						<p className="text-xs text-[--text-muted] mt-3">
							{Object.values(taskOutputs).reduce((sum, o) => sum + (o.files?.length ?? 0), 0)}{" "}
							file(s) generated — available in task outputs above.
						</p>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="border-t border-[--border] bg-[--bg-secondary] px-6 py-4">
			<div className="max-w-2xl">
				{/* Idle or error — show sync wizard */}
				{(step === "idle" || step === "syncing") && (
					<GitHubSyncSection runId={runId} taskOutputs={taskOutputs} onSync={handleSync} />
				)}

				{/* Synced or later — show CI/deploy pipeline */}
				{step !== "idle" && step !== "syncing" && deploymentState && (
					<CIStatusPanel
						runId={runId}
						deploymentState={deploymentState}
						onDeploymentUpdate={onRefresh}
					/>
				)}
			</div>
		</div>
	);
}
