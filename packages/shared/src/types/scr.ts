/**
 * Spec Change Request (SCR) types — governance for frozen spec modifications.
 *
 * A frozen spec is law. Changing it is a governance event, not a chat edit.
 * SCR provides formal change-request workflow with delta execution support.
 */

import type { PlanTask } from "./plan.js";

/** SCR lifecycle status */
export enum SCRStatus {
	Open = "OPEN",
	ImpactAnalyzed = "IMPACT_ANALYZED",
	Approved = "APPROVED",
	Rejected = "REJECTED",
	Deferred = "DEFERRED",
	Executing = "EXECUTING",
	Completed = "COMPLETED",
}

/** Semantic change severity (semver-like) */
export enum SCRSeverity {
	/** Clarification only — no task impact */
	Patch = "PATCH",
	/** Additive change — new criteria added */
	Minor = "MINOR",
	/** Breaking change — criteria modified or removed */
	Major = "MAJOR",
}

/** A single diff between spec versions */
export interface DiffPackItem {
	/** Unique diff ID, e.g. "DIFF-001" */
	id: string;
	/** Type of change (from DeltaChangeType) */
	changeType: string;
	/** Field path or element ID */
	path: string;
	/** Old value summary */
	oldValue: string | null;
	/** New value summary */
	newValue: string | null;
	/** Affected acceptance criteria IDs */
	affectedCriteriaIds: string[];
}

/** The full diff pack between two spec versions */
export interface DiffPack {
	oldSpecId: string;
	oldSpecVersion: number;
	newSpecId: string;
	newSpecVersion: number;
	items: DiffPackItem[];
	severity: SCRSeverity;
}

/** Task patch entry — every entry must cite a DiffPack item */
export interface TaskPatchEntry {
	taskId: string;
	action: "add" | "update" | "invalidate" | "cancel";
	/** Must reference a DiffPackItem.id — no diff citation = not allowed */
	diffItemId: string;
	reason: string;
	/** For "add" — full new task definition */
	newTask?: PlanTask;
	/** For "update" — partial task changes */
	updates?: Partial<PlanTask>;
}

/** The task patch generated from a DiffPack */
export interface TaskPatch {
	scrId: string;
	runId: string;
	addTasks: TaskPatchEntry[];
	updateTasks: TaskPatchEntry[];
	/** Reset to PENDING for re-execution */
	invalidateTasks: TaskPatchEntry[];
	/** Mark as removed/deferred */
	cancelTasks: TaskPatchEntry[];
}

/** Baseline snapshot of run state before delta execution */
export interface BaselineSnapshot {
	runId: string;
	capturedAt: string;
	/** taskId → status at capture time */
	taskStatuses: Record<string, string>;
	/** Preserve completed work — taskId → TaskOutput */
	completedOutputs: Record<string, unknown>;
}

/** The Spec Change Request document */
export interface SpecChangeRequest {
	id: string;
	projectId: string;
	/** Original frozen spec ID */
	frozenSpecId: string;
	/** New spec ID (created from editFrozenSpec) */
	newSpecId: string;
	status: SCRStatus;
	severity: SCRSeverity;
	diffPack: DiffPack;
	taskPatch?: TaskPatch;
	baselineSnapshot?: BaselineSnapshot;
	requestedBy: string;
	requestedAt: string;
	reviewedBy?: string;
	reviewedAt?: string;
	/** Why the change is needed — required */
	reason: string;
	/** Associated run ID for delta execution */
	runId?: string;
}
