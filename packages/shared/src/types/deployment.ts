/**
 * Deployment pipeline types — post-run GitHub sync, CI monitoring, deploy.
 */

export type DeploymentStep =
	| "idle"
	| "syncing"
	| "synced"
	| "ci_running"
	| "ci_passed"
	| "ci_failed"
	| "deploying"
	| "deployed";

export interface DeploymentState {
	step: DeploymentStep;
	branchName?: string;
	commitSha?: string;
	prNumber?: number;
	prUrl?: string;
	workflowRunId?: number;
	workflowRunUrl?: string;
	deployedAt?: string;
	error?: string;
}
