/**
 * Spec Change Request (SCR) service — governance for frozen spec modifications.
 *
 * A frozen spec is law. Changing it is a governance event, not a chat edit.
 * This service implements the full SCR lifecycle:
 *   1. Create SCR (with impact analysis)
 *   2. Approve / Reject
 *   3. Delta execution (patch existing plan, only re-execute affected tasks)
 */

import { generateSpec, type SpecGeneratorConfig } from "@blueflame/foundry";
import type {
	BaselineSnapshot,
	DiffPack,
	DiffPackItem,
	OutputSpec,
	Result,
	SpecChangeRequest,
	TaskPatch,
	TaskPatchEntry,
} from "@blueflame/shared";
import { AgentRole, SCRSeverity, SCRStatus, SpecStatus, TaskStatus } from "@blueflame/shared";
import { db } from "../db.js";
import { logAuditEvent } from "./audit-logger.js";
import {
	type DeltaAnalysis,
	DeltaChangeType,
	TaskImpact,
	analyzeSpecDelta,
} from "./delta-detection.js";
import { applyTaskPatch, getRun } from "./orchestrator.js";
import { editFrozenSpec, freezeSpec } from "./spec-freeze.js";
import { getSpec } from "./spec-generation.js";

/** In-memory SCR store (write-through to Cosmos) */
const scrStore = new Map<string, SpecChangeRequest>();
let scrCounter = 0;

/**
 * Create a Spec Change Request with automatic impact analysis.
 *
 * Steps:
 * 1. Calls editFrozenSpec() to create new spec version (v+1 as DRAFT)
 * 2. Runs delta detection between frozen spec and new spec
 * 3. Builds DiffPack from detected changes
 * 4. Determines severity (PATCH / MINOR / MAJOR)
 * 5. Returns SCR with status IMPACT_ANALYZED
 */
export async function createSCR(
	projectId: string,
	frozenSpecId: string,
	newContent: string,
	requestedBy: string,
	reason: string,
): Promise<Result<SpecChangeRequest>> {
	if (!reason.trim()) {
		return { ok: false, error: new Error("Reason is required for a Spec Change Request") };
	}

	// Get the frozen spec
	const frozenSpec = await getSpec(frozenSpecId);
	if (!frozenSpec) {
		return { ok: false, error: new Error(`Frozen spec not found: ${frozenSpecId}`) };
	}
	if (frozenSpec.status !== SpecStatus.Frozen) {
		return {
			ok: false,
			error: new Error(`Spec must be FROZEN to create an SCR (current: ${frozenSpec.status})`),
		};
	}

	// Create new spec version via editFrozenSpec
	const editResult = await editFrozenSpec(frozenSpecId, newContent, requestedBy);
	if (!editResult.ok) {
		return { ok: false, error: editResult.error };
	}
	const newSpec = editResult.value;

	// Find existing tasks for impact analysis (from the latest run for this project)
	const existingTasks = await getExistingTasksForProject(projectId);

	// Run delta analysis
	const delta = analyzeSpecDelta(frozenSpec, newSpec, existingTasks);

	// Build DiffPack
	const diffPack = buildDiffPack(frozenSpec, newSpec, delta);

	// Create SCR
	scrCounter += 1;
	const scrId = `scr-${projectId}-${Date.now()}-${scrCounter}`;

	const scr: SpecChangeRequest = {
		id: scrId,
		projectId,
		frozenSpecId,
		newSpecId: newSpec.id,
		status: SCRStatus.ImpactAnalyzed,
		severity: diffPack.severity,
		diffPack,
		requestedBy,
		requestedAt: new Date().toISOString(),
		reason,
	};

	// Store in memory + Cosmos
	scrStore.set(scrId, scr);
	persistSCR(scr);

	// Audit trail
	logAuditEvent({
		eventType: "AUTH",
		actor: requestedBy,
		action: "scr.created",
		resource: scrId,
		outcome: "ALLOWED",
		details: `SCR created: ${delta.summary.totalChanges} changes, severity=${diffPack.severity}`,
		projectId,
	}).catch(() => {});

	return { ok: true, value: scr };
}

/**
 * Approve an SCR — generates TaskPatch from impact analysis.
 */
export async function approveSCR(
	scrId: string,
	reviewedBy: string,
): Promise<Result<SpecChangeRequest>> {
	const scr = await getSCR(scrId);
	if (!scr) {
		return { ok: false, error: new Error(`SCR not found: ${scrId}`) };
	}
	if (scr.status !== SCRStatus.ImpactAnalyzed) {
		return {
			ok: false,
			error: new Error(`SCR must be IMPACT_ANALYZED to approve (current: ${scr.status})`),
		};
	}

	// Find the latest run for this project to generate task patch
	const runId = await findLatestRunId(scr.projectId);
	if (!runId) {
		return { ok: false, error: new Error("No existing run found for delta execution") };
	}

	// Get existing tasks for the run
	const run = await getRun(runId);
	if (!run) {
		return { ok: false, error: new Error(`Run not found: ${runId}`) };
	}

	// Get both specs for re-analysis
	const frozenSpec = await getSpec(scr.frozenSpecId);
	const newSpec = await getSpec(scr.newSpecId);
	if (!frozenSpec || !newSpec) {
		return { ok: false, error: new Error("Cannot load specs for impact analysis") };
	}

	// Re-run delta analysis with actual run tasks
	const delta = analyzeSpecDelta(frozenSpec, newSpec, run.plan.tasks);

	// Generate TaskPatch
	const taskPatch = generateTaskPatch(scrId, runId, delta, scr.diffPack);

	scr.taskPatch = taskPatch;
	scr.runId = runId;
	scr.status = SCRStatus.Approved;
	scr.reviewedBy = reviewedBy;
	scr.reviewedAt = new Date().toISOString();

	scrStore.set(scrId, scr);
	persistSCR(scr);

	logAuditEvent({
		eventType: "AUTH",
		actor: reviewedBy,
		action: "scr.approved",
		resource: scrId,
		outcome: "ALLOWED",
		details: `SCR approved: ${taskPatch.invalidateTasks.length} invalidated, ${taskPatch.addTasks.length} new, ${taskPatch.cancelTasks.length} cancelled`,
		projectId: scr.projectId,
	}).catch(() => {});

	return { ok: true, value: scr };
}

/**
 * Reject an SCR.
 */
export async function rejectSCR(
	scrId: string,
	reviewedBy: string,
	rejectReason: string,
): Promise<Result<SpecChangeRequest>> {
	const scr = await getSCR(scrId);
	if (!scr) {
		return { ok: false, error: new Error(`SCR not found: ${scrId}`) };
	}
	if (scr.status !== SCRStatus.ImpactAnalyzed) {
		return {
			ok: false,
			error: new Error(`SCR must be IMPACT_ANALYZED to reject (current: ${scr.status})`),
		};
	}

	scr.status = SCRStatus.Rejected;
	scr.reviewedBy = reviewedBy;
	scr.reviewedAt = new Date().toISOString();

	scrStore.set(scrId, scr);
	persistSCR(scr);

	logAuditEvent({
		eventType: "AUTH",
		actor: reviewedBy,
		action: "scr.rejected",
		resource: scrId,
		outcome: "DENIED",
		details: `SCR rejected: ${rejectReason}`,
		projectId: scr.projectId,
	}).catch(() => {});

	return { ok: true, value: scr };
}

/**
 * Execute delta run — applies TaskPatch to existing run, resumes only affected tasks.
 */
export async function executeDeltaRun(scrId: string): Promise<Result<{ runId: string }>> {
	const scr = await getSCR(scrId);
	if (!scr) {
		return { ok: false, error: new Error(`SCR not found: ${scrId}`) };
	}
	if (scr.status !== SCRStatus.Approved) {
		return {
			ok: false,
			error: new Error(`SCR must be APPROVED to execute (current: ${scr.status})`),
		};
	}
	if (!scr.taskPatch || !scr.runId) {
		return { ok: false, error: new Error("SCR has no task patch or run ID") };
	}

	const run = await getRun(scr.runId);
	if (!run) {
		return { ok: false, error: new Error(`Run not found: ${scr.runId}`) };
	}

	// Capture baseline snapshot before modifying
	const baseline: BaselineSnapshot = {
		runId: scr.runId,
		capturedAt: new Date().toISOString(),
		taskStatuses: Object.fromEntries(run.plan.tasks.map((t) => [t.id, t.status])),
		completedOutputs: { ...run.taskOutputs },
	};
	scr.baselineSnapshot = baseline;

	// Freeze the new spec version before execution
	const newSpec = await getSpec(scr.newSpecId);
	if (newSpec && newSpec.status === SpecStatus.Draft) {
		// Accept then freeze the new spec
		newSpec.status = SpecStatus.Accepted;
		await db.specs.update(newSpec, newSpec.projectId);
		await freezeSpec(newSpec.id);
	}

	// Apply the task patch to the existing run (sets run to AUTHORIZED, not EXECUTING)
	const patchResult = await applyTaskPatch(scr.runId, scr.taskPatch);
	if (!patchResult.ok) {
		return { ok: false, error: patchResult.error };
	}

	// Run is now AUTHORIZED with patched tasks — user must click "Start Execution" on the run dashboard
	scr.status = SCRStatus.Approved;
	scrStore.set(scrId, scr);
	persistSCR(scr);

	logAuditEvent({
		eventType: "AGENT",
		actor: "orchestrator",
		action: "scr.delta-execution-started",
		resource: scrId,
		outcome: "ALLOWED",
		details: `Delta execution started for run ${scr.runId}`,
		projectId: scr.projectId,
		runId: scr.runId,
	}).catch(() => {});

	return { ok: true, value: { runId: scr.runId } };
}

/**
 * Get an SCR by ID. Falls back to Cosmos on cache miss.
 */
export async function getSCR(scrId: string): Promise<SpecChangeRequest | undefined> {
	const cached = scrStore.get(scrId);
	if (cached) return cached;

	try {
		const docs = await db.documents.queryAll({
			query: "SELECT * FROM c WHERE c.id = @id AND c.type = 'scr'",
			parameters: [{ name: "@id", value: scrId }],
		});
		if (docs.length > 0) {
			const scr = docs[0] as unknown as SpecChangeRequest;
			scrStore.set(scrId, scr);
			return scr;
		}
	} catch {
		// Cosmos unavailable
	}
	return undefined;
}

/**
 * List SCRs for a project.
 */
export async function listSCRsByProject(projectId: string): Promise<SpecChangeRequest[]> {
	// Try Cosmos first
	try {
		const docs = await db.documents.queryAll({
			query:
				"SELECT * FROM c WHERE c.projectId = @pid AND c.type = 'scr' ORDER BY c.requestedAt DESC",
			parameters: [{ name: "@pid", value: projectId }],
		});
		return docs as unknown as SpecChangeRequest[];
	} catch {
		// Fallback to in-memory
		return Array.from(scrStore.values())
			.filter((s) => s.projectId === projectId)
			.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
	}
}

/**
 * Generate updated spec YAML from a natural language change description.
 * Reuses the existing spec-generator agent with a synthetic conversation.
 */
export async function generateSCRYaml(
	frozenSpecId: string,
	changeDescription: string,
): Promise<Result<string>> {
	const frozenSpec = await getSpec(frozenSpecId);
	if (!frozenSpec) {
		return { ok: false, error: new Error(`Frozen spec not found: ${frozenSpecId}`) };
	}

	const config: SpecGeneratorConfig = {
		endpoint: process.env.FOUNDRY_ENDPOINT ?? process.env.AZURE_OPENAI_ENDPOINT ?? "",
		apiKey: process.env.FOUNDRY_API_KEY ?? process.env.AZURE_OPENAI_API_KEY ?? "",
		deployment:
			process.env.FOUNDRY_SPEC_DEPLOYMENT ?? process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o",
		apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-12-01-preview",
	};

	if (!config.endpoint || !config.apiKey) {
		return { ok: false, error: new Error("Foundry/Azure OpenAI not configured") };
	}

	const syntheticConversation = [
		{
			role: "user" as const,
			content: `Current frozen spec:\n\n${frozenSpec.content}\n\nRequested change: ${changeDescription}\n\nGenerate the complete updated YAML spec incorporating this change.`,
		},
	];

	try {
		const updatedYaml = await generateSpec(config, syntheticConversation);
		return { ok: true, value: updatedYaml };
	} catch (err) {
		return {
			ok: false,
			error: new Error(err instanceof Error ? err.message : "Spec generation failed"),
		};
	}
}

/**
 * Clear all SCRs (for testing).
 */
export function clearAllSCRs(): void {
	scrStore.clear();
	scrCounter = 0;
}

// ─── Internal Helpers ────────────────────────────────────────

function persistSCR(scr: SpecChangeRequest): void {
	const doc = {
		...scr,
		type: "scr",
	};
	db.documents.upsert(doc as never, scr.projectId).catch((err) => {
		console.error("[SCR] Cosmos persist failed:", err);
	});
}

function buildDiffPack(
	frozenSpec: OutputSpec,
	newSpec: OutputSpec,
	delta: DeltaAnalysis,
): DiffPack {
	const items: DiffPackItem[] = delta.changes.map((change, index) => ({
		id: `DIFF-${String(index + 1).padStart(3, "0")}`,
		changeType: change.type,
		path: change.path,
		oldValue: change.oldValue,
		newValue: change.newValue,
		affectedCriteriaIds: change.affectedCriteriaIds,
	}));

	// Determine severity
	const hasBreaking = delta.changes.some(
		(c) =>
			c.type === DeltaChangeType.CriterionModified ||
			c.type === DeltaChangeType.CriterionRemoved ||
			c.type === DeltaChangeType.ConstraintModified ||
			c.type === DeltaChangeType.ConstraintRemoved ||
			c.type === DeltaChangeType.DeliverableRemoved ||
			c.type === DeltaChangeType.DeliverableModified,
	);
	const hasAdditive = delta.changes.some(
		(c) =>
			c.type === DeltaChangeType.CriterionAdded ||
			c.type === DeltaChangeType.DeliverableAdded ||
			c.type === DeltaChangeType.ConstraintAdded,
	);

	let severity: SCRSeverity;
	if (hasBreaking) {
		severity = SCRSeverity.Major;
	} else if (hasAdditive) {
		severity = SCRSeverity.Minor;
	} else {
		severity = SCRSeverity.Patch;
	}

	return {
		oldSpecId: frozenSpec.id,
		oldSpecVersion: frozenSpec.version,
		newSpecId: newSpec.id,
		newSpecVersion: newSpec.version,
		items,
		severity,
	};
}

function generateTaskPatch(
	scrId: string,
	runId: string,
	delta: DeltaAnalysis,
	diffPack: DiffPack,
): TaskPatch {
	const addTasks: TaskPatchEntry[] = [];
	const updateTasks: TaskPatchEntry[] = [];
	const invalidateTasks: TaskPatchEntry[] = [];
	const cancelTasks: TaskPatchEntry[] = [];

	for (const impact of delta.taskImpacts) {
		// Find the DiffPack item that caused this impact
		const diffItemId = findMatchingDiffItem(impact.relatedChanges, diffPack);

		switch (impact.impact) {
			case TaskImpact.Rebuild:
				invalidateTasks.push({
					taskId: impact.taskId,
					action: "invalidate",
					diffItemId,
					reason: impact.reason,
				});
				break;
			case TaskImpact.New:
				addTasks.push({
					taskId: impact.taskId,
					action: "add",
					diffItemId,
					reason: impact.reason,
					newTask: {
						id: impact.taskId,
						description: `Task for new criterion: ${impact.reason}`,
						acceptanceCriteriaIds: impact.relatedChanges.flatMap((c) => c.affectedCriteriaIds),
						dependencies: [],
						agentRole: AgentRole.Builder,
						estimatedTokens: 5000,
						estimatedCost: 0.05,
						sigmaEstimate: 0.3,
						parallelizable: true,
						status: TaskStatus.Pending,
					},
				});
				break;
			case TaskImpact.Remove:
				cancelTasks.push({
					taskId: impact.taskId,
					action: "cancel",
					diffItemId,
					reason: impact.reason,
				});
				break;
			// TaskImpact.Preserve → no patch entry needed
		}
	}

	return {
		scrId,
		runId,
		addTasks,
		updateTasks,
		invalidateTasks,
		cancelTasks,
	};
}

function findMatchingDiffItem(
	relatedChanges: Array<{ affectedCriteriaIds: string[] }>,
	diffPack: DiffPack,
): string {
	// Find the first DiffPack item whose affected criteria overlap with the changes
	for (const change of relatedChanges) {
		for (const item of diffPack.items) {
			const overlap = item.affectedCriteriaIds.some((id) =>
				change.affectedCriteriaIds.includes(id),
			);
			if (overlap) return item.id;
		}
	}
	// Fallback: first diff item
	return diffPack.items[0]?.id ?? "DIFF-000";
}

async function getExistingTasksForProject(
	projectId: string,
): Promise<import("@blueflame/shared").PlanTask[]> {
	const runId = await findLatestRunId(projectId);
	if (!runId) return [];
	const run = await getRun(runId);
	return run?.plan.tasks ?? [];
}

async function findLatestRunId(projectId: string): Promise<string | undefined> {
	try {
		const docs = await db.documents.queryAll({
			query:
				"SELECT * FROM c WHERE c.projectId = @pid AND c.type = 'run-state' ORDER BY c.startedAt DESC",
			parameters: [{ name: "@pid", value: projectId }],
		});
		if (docs.length > 0) {
			return (docs[0] as unknown as { runId: string }).runId;
		}
	} catch {
		// Cosmos unavailable — no run to find
	}
	return undefined;
}
