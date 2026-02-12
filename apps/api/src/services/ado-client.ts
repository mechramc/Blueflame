/**
 * Azure DevOps outbound client for pipeline operations.
 *
 * Dual implementation:
 *   - Real: uses azure-devops-node-api SDK when ADO_PAT + ADO_ORG_URL are set
 *   - Simulated: in-memory fallback for dev/testing when ADO credentials are absent
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

/** Common interface for ADO operations */
export interface IAdoClient {
	triggerPipeline(params: TriggerPipelineParams): Promise<PipelineRun>;
	getPipelineRun(runId: number): Promise<PipelineRun | null>;
	listPipelineRuns(pipelineId: number, top?: number): Promise<PipelineRun[]>;
	createWorkItem(params: CreateWorkItemParams): Promise<WorkItemRef>;
	getWorkItem(id: number): Promise<WorkItemRef | null>;
	getOrgUrl(): string;
	getProject(): string;
	isReal(): boolean;
}

// ─── Simulated Client (in-memory, for dev/testing) ───────────

/**
 * In-memory simulated ADO client.
 * Used when ADO_PAT is not configured.
 */
export class SimulatedAdoClient implements IAdoClient {
	private readonly config: AdoClientConfig;
	private readonly runs: Map<number, PipelineRun> = new Map();
	private readonly workItems: Map<number, WorkItemRef> = new Map();
	private runCounter = 1000;
	private workItemCounter = 5000;

	constructor(config: AdoClientConfig) {
		this.config = config;
	}

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

	async getPipelineRun(runId: number): Promise<PipelineRun | null> {
		return this.runs.get(runId) ?? null;
	}

	async listPipelineRuns(pipelineId: number, top = 10): Promise<PipelineRun[]> {
		return [...this.runs.values()]
			.filter((r) => r.pipelineId === pipelineId)
			.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
			.slice(0, top);
	}

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

	async getWorkItem(id: number): Promise<WorkItemRef | null> {
		return this.workItems.get(id) ?? null;
	}

	getOrgUrl(): string {
		return this.config.orgUrl;
	}

	getProject(): string {
		return this.config.project;
	}

	isReal(): boolean {
		return false;
	}
}

// ─── Real Client (azure-devops-node-api SDK) ─────────────────

/**
 * Real ADO client backed by azure-devops-node-api.
 * Used when ADO_PAT + ADO_ORG_URL are configured.
 */
export class RealAdoClient implements IAdoClient {
	private readonly config: AdoClientConfig;
	private connection: unknown = null;

	constructor(config: AdoClientConfig) {
		this.config = config;
	}

	private async getConnection() {
		if (!this.connection) {
			const azdev = await import("azure-devops-node-api");
			const authHandler = azdev.getPersonalAccessTokenHandler(this.config.pat);
			this.connection = new azdev.WebApi(this.config.orgUrl, authHandler) as unknown as typeof this.connection;
		}
		return this.connection;
	}

	async triggerPipeline(params: TriggerPipelineParams): Promise<PipelineRun> {
		const conn = await this.getConnection();
		const buildApi = await (conn as { getBuildApi(): Promise<unknown> }).getBuildApi() as {
			queueBuild(build: unknown, project: string): Promise<{
				id?: number;
				buildNumber?: string;
				status?: number;
				result?: number;
				startTime?: Date;
				finishTime?: Date;
				url?: string;
				definition?: { id?: number };
			}>;
		};

		const buildDef = {
			definition: { id: params.pipelineId },
			sourceBranch: params.branch,
		};

		const build = await buildApi.queueBuild(buildDef, this.config.project);

		return {
			id: build.id ?? 0,
			pipelineId: params.pipelineId,
			name: build.buildNumber ?? `Build ${build.id}`,
			status: PipelineRunStatus.NotStarted,
			result: null,
			createdDate: new Date().toISOString(),
			finishedDate: null,
			url: build.url ?? `${this.config.orgUrl}/${this.config.project}/_build/results?buildId=${build.id}`,
		};
	}

	async getPipelineRun(runId: number): Promise<PipelineRun | null> {
		const conn = await this.getConnection();
		const buildApi = await (conn as { getBuildApi(): Promise<unknown> }).getBuildApi() as {
			getBuild(project: string, buildId: number): Promise<{
				id?: number;
				buildNumber?: string;
				status?: number;
				result?: number;
				startTime?: Date;
				finishTime?: Date;
				url?: string;
				definition?: { id?: number };
			} | null>;
		};

		const build = await buildApi.getBuild(this.config.project, runId);
		if (!build) return null;

		return {
			id: build.id ?? runId,
			pipelineId: build.definition?.id ?? 0,
			name: build.buildNumber ?? `Build ${runId}`,
			status: mapBuildStatus(build.status),
			result: mapBuildResult(build.result),
			createdDate: build.startTime?.toISOString() ?? new Date().toISOString(),
			finishedDate: build.finishTime?.toISOString() ?? null,
			url: build.url ?? "",
		};
	}

	async listPipelineRuns(pipelineId: number, top = 10): Promise<PipelineRun[]> {
		const conn = await this.getConnection();
		const buildApi = await (conn as { getBuildApi(): Promise<unknown> }).getBuildApi() as {
			getBuilds(project: string, definitions?: number[], queues?: undefined, buildNumber?: undefined, minTime?: undefined, maxTime?: undefined, requestedFor?: undefined, reasonFilter?: undefined, statusFilter?: undefined, resultFilter?: undefined, tagFilters?: undefined, properties?: undefined, top?: number): Promise<Array<{
				id?: number;
				buildNumber?: string;
				status?: number;
				result?: number;
				startTime?: Date;
				finishTime?: Date;
				url?: string;
				definition?: { id?: number };
			}>>;
		};

		const builds = await buildApi.getBuilds(
			this.config.project,
			[pipelineId],
			undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
			top,
		);

		return builds.map((b) => ({
			id: b.id ?? 0,
			pipelineId: b.definition?.id ?? pipelineId,
			name: b.buildNumber ?? `Build ${b.id}`,
			status: mapBuildStatus(b.status),
			result: mapBuildResult(b.result),
			createdDate: b.startTime?.toISOString() ?? new Date().toISOString(),
			finishedDate: b.finishTime?.toISOString() ?? null,
			url: b.url ?? "",
		}));
	}

	async createWorkItem(params: CreateWorkItemParams): Promise<WorkItemRef> {
		const conn = await this.getConnection();
		const witApi = await (conn as { getWorkItemTrackingApi(): Promise<unknown> }).getWorkItemTrackingApi() as {
			createWorkItem(customHeaders: undefined, document: Array<{ op: string; path: string; value: string }>, project: string, type: string): Promise<{
				id?: number;
				url?: string;
				fields?: Record<string, string>;
			}>;
		};

		const patchDoc = [
			{ op: "add", path: "/fields/System.Title", value: params.title },
			{ op: "add", path: "/fields/System.Description", value: params.description },
		];

		if (params.assignedTo) {
			patchDoc.push({ op: "add", path: "/fields/System.AssignedTo", value: params.assignedTo });
		}
		if (params.areaPath) {
			patchDoc.push({ op: "add", path: "/fields/System.AreaPath", value: params.areaPath });
		}
		if (params.tags?.length) {
			patchDoc.push({ op: "add", path: "/fields/System.Tags", value: params.tags.join("; ") });
		}

		const item = await witApi.createWorkItem(undefined, patchDoc, this.config.project, params.type);

		return {
			id: item.id ?? 0,
			url: item.url ?? `${this.config.orgUrl}/${this.config.project}/_workitems/edit/${item.id}`,
			type: params.type,
			title: params.title,
		};
	}

	async getWorkItem(id: number): Promise<WorkItemRef | null> {
		const conn = await this.getConnection();
		const witApi = await (conn as { getWorkItemTrackingApi(): Promise<unknown> }).getWorkItemTrackingApi() as {
			getWorkItem(id: number): Promise<{
				id?: number;
				url?: string;
				fields?: Record<string, string>;
			} | null>;
		};

		const item = await witApi.getWorkItem(id);
		if (!item) return null;

		return {
			id: item.id ?? id,
			url: item.url ?? "",
			type: item.fields?.["System.WorkItemType"] ?? "Unknown",
			title: item.fields?.["System.Title"] ?? "",
		};
	}

	getOrgUrl(): string {
		return this.config.orgUrl;
	}

	getProject(): string {
		return this.config.project;
	}

	isReal(): boolean {
		return true;
	}
}

// ─── Status Mapping ──────────────────────────────────────────

function mapBuildStatus(status: number | undefined): PipelineRunStatus {
	switch (status) {
		case 1: return PipelineRunStatus.InProgress;
		case 2: return PipelineRunStatus.Completed;
		case 4: return PipelineRunStatus.Cancelling;
		case 8: return PipelineRunStatus.Cancelled;
		default: return PipelineRunStatus.NotStarted;
	}
}

function mapBuildResult(result: number | undefined): PipelineRunResult | null {
	switch (result) {
		case 2: return PipelineRunResult.Succeeded;
		case 8: return PipelineRunResult.Failed;
		case 32: return PipelineRunResult.Canceled;
		default: return null;
	}
}

// ─── Factory ─────────────────────────────────────────────────

/**
 * Create an ADO client from environment variables.
 * Returns RealAdoClient when ADO_PAT is set, SimulatedAdoClient otherwise.
 */
export function createAdoClientFromEnv(): IAdoClient | null {
	const orgUrl = process.env.ADO_ORG_URL;
	const pat = process.env.ADO_PAT;
	const project = process.env.ADO_PROJECT ?? "Blueflame";

	if (!orgUrl) {
		return null;
	}

	const config: AdoClientConfig = { orgUrl, pat: pat ?? "", project };

	if (pat) {
		console.log(`[ADO] Real client initialized for ${orgUrl}/${project}`);
		return new RealAdoClient(config);
	}

	console.log("[ADO] No PAT configured — using simulated client");
	return new SimulatedAdoClient(config);
}

// ─── Legacy alias (backwards compat) ─────────────────────────
/** @deprecated Use SimulatedAdoClient or createAdoClientFromEnv() */
export const AdoClient = SimulatedAdoClient;
