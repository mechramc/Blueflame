/**
 * @blueflame/github-app — GitHub App client
 *
 * All GitHub operations go through this package.
 * Apps should never import Octokit directly.
 */

export {
	type GitHubAppConfig,
	type GitHubClientConfig,
	branchName,
	createOctokitClient,
} from "./client.js";

export {
	clearTokenCache,
	getInstallationToken,
	hasValidToken,
} from "./auth/installation-token.js";

export {
	type BranchResult,
	type CreateBranchParams,
	branchExists,
	createBranch,
	deleteBranch,
} from "./operations/branches.js";

export {
	type CommitParams,
	type CommitResult,
	type FileToCommit,
	commitFiles,
} from "./operations/commits.js";

export {
	type CreatePRParams,
	type PRResult,
	createPR,
	getPR,
	updatePRBody,
} from "./operations/pull-requests.js";

export {
	type TriggerWorkflowParams,
	type WorkflowRun,
	getWorkflowRun,
	getWorkflowRunLogs,
	getWorkflowRuns,
	triggerWorkflow,
} from "./operations/actions.js";

export {
	type DiffResult,
	type FileDiff,
	compareCommits,
	formatDiff,
	getPRDiff,
} from "./operations/diffs.js";
