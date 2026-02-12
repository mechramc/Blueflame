/**
 * Azure DevOps outbound client for pipeline operations.
 *
 * Provides typed operations for ADO pipeline triggers, build status queries,
 * and work item creation. Uses REST API patterns compatible with azure-devops-node-api.
 *
 * Source: Blueflame-Spec-v3-ACAR.md Section 15 (CI/CD Templates)
 */

/** ADO client configuration */
export interface AdoClientConfig {
	orgUrl: string;
	pat: string;
	project: string;
}

/** Pipeline run status */
export enum PipelineRunStatus {
	NotStarted = "notStarted",
	InProgress = "inProgress",
	Completed = "completed",
	Cancelling = "cancelling",
	Cancelled = "cancelled",
}

/** Pipeline run result */
export enum PipelineRunResult {
	Succeeded = "succeeded",
	Failed = "failed",
	Canceled = "canceled",
	Unknown = "unknown",
}

/** Pipeline definition reference */
export interface PipelineRef {
	id: number;
	name: string;
	revision: number;
}

/** Pipeline run */
export interface PipelineRun {
	id: number;
	pipelineId: number;
	name: string;
	status: PipelineRunStatus;
	result: PipelineRunResult | null;
	createdDate: string;
	finishedDate: string | null;
	url: string;
}

/** Trigger pipeline parameters */
export interface TriggerPipelineParams {
	pipelineId: number;
	branch: string;
	variables?: Record<string, string>;
}

/** Work item to create */
export interface CreateWorkItemParams {
	type: "Bug" | "Task" | "UserStory";
	title: string;
	description: string;
	assignedTo?: string;
	areaPath?: string;
	tags?: string[];
}

/** Work item reference */
export interface WorkItemRef {
	id: number;
	url: string;
	type: string;
	title: string;
}

/**
 * Azure DevOps outbound client.
 *
 * In MVP: operations use in-memory simulation for testing.
 * In production: wired to azure-devops-node-api with real ADO REST calls.
 */
export class AdoClient {
	private readonly config: AdoClientConfig;
	private readonly runs: Map<number, PipelineRun> = new Map();
	private readonly workItems: Map<number, WorkItemRef> = new Map();
	private runCounter = 1000;
	private workItemCounter = 5000;

	constructor(config: AdoClientConfig) {
		this.config = config;
	}

	/**
	 * Trigger a pipeline run.
	 */
	async triggerPipeline(params: TriggerPipelineParams): Promise<PipelineRun> {
		const run: PipelineRun = {
			id: this.runCounter++,
			pipelineId: params.pipelineId,
			name: `Run ${this.runCounter}`,
			status: PipelineRunStatus.NotStarted,
			result: null,
			createdDate: new Date().toISOString(),
			finishedDate: null,
			url: `${this.config.orgUrl}/${this.config.project}/_build/results?buildId=${this.runCounter}`,
		};

		this.runs.set(run.id, run);
		return run;
	}

	/**
	 * Get pipeline run status.
	 */
	async getPipelineRun(runId: number): Promise<PipelineRun | null> {
		return this.runs.get(runId) ?? null;
	}

	/**
	 * List recent pipeline runs for a pipeline definition.
	 */
	async listPipelineRuns(pipelineId: number, top = 10): Promise<PipelineRun[]> {
		const allRuns = [...this.runs.values()];
		return allRuns
			.filter((r) => r.pipelineId === pipelineId)
			.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
			.slice(0, top);
	}

	/**
	 * Create a work item (Bug, Task, or UserStory).
	 */
	async createWorkItem(params: CreateWorkItemParams): Promise<WorkItemRef> {
		const item: WorkItemRef = {
			id: this.workItemCounter++,
			url: `${this.config.orgUrl}/${this.config.project}/_workitems/edit/${this.workItemCounter}`,
			type: params.type,
			title: params.title,
		};

		this.workItems.set(item.id, item);
		return item;
	}

	/**
	 * Get a work item by ID.
	 */
	async getWorkItem(id: number): Promise<WorkItemRef | null> {
		return this.workItems.get(id) ?? null;
	}

	/**
	 * Get the configured org URL.
	 */
	getOrgUrl(): string {
		return this.config.orgUrl;
	}

	/**
	 * Get the configured project name.
	 */
	getProject(): string {
		return this.config.project;
	}
}

/**
 * Create an ADO client from environment variables.
 */
export function createAdoClientFromEnv(): AdoClient | null {
	const orgUrl = process.env.ADO_ORG_URL;
	const pat = process.env.ADO_PAT;
	const project = process.env.ADO_PROJECT;

	if (!orgUrl || !pat || !project) {
		return null;
	}

	return new AdoClient({ orgUrl, pat, project });
}
