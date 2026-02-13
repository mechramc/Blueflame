/**
 * Spec Delta Detection — compare two spec versions and produce impact map.
 *
 * Compares field-level differences between spec v1 and v2.
 * Classifies each change and maps to affected tasks via acceptance_criteria_ids.
 * Produces PRESERVE / REBUILD / NEW / REMOVE per task.
 *
 * Source: Blueflame-Spec-v3-ACAR.md Section 17 (WF6)
 */

import type { OutputSpec, PlanTask } from "@blueflame/shared";

/** Type of change detected between spec versions */
export enum DeltaChangeType {
	CriterionAdded = "CRITERION_ADDED",
	CriterionRemoved = "CRITERION_REMOVED",
	CriterionModified = "CRITERION_MODIFIED",
	ConstraintAdded = "CONSTRAINT_ADDED",
	ConstraintRemoved = "CONSTRAINT_REMOVED",
	ConstraintModified = "CONSTRAINT_MODIFIED",
	DeliverableAdded = "DELIVERABLE_ADDED",
	DeliverableRemoved = "DELIVERABLE_REMOVED",
	DeliverableModified = "DELIVERABLE_MODIFIED",
	MetadataChanged = "METADATA_CHANGED",
}

/** A single detected change between two spec versions */
export interface SpecChange {
	type: DeltaChangeType;
	/** Field path or ID of the changed element */
	path: string;
	/** Old value summary */
	oldValue: string | null;
	/** New value summary */
	newValue: string | null;
	/** Affected acceptance criteria IDs */
	affectedCriteriaIds: string[];
}

/** Impact classification for a task */
export enum TaskImpact {
	/** Task is unaffected — keep as-is */
	Preserve = "PRESERVE",
	/** Task is affected — needs re-execution */
	Rebuild = "REBUILD",
	/** Task is new — corresponds to new criteria */
	New = "NEW",
	/** Task should be removed — criteria were deleted */
	Remove = "REMOVE",
}

/** Impact assessment for a single task */
export interface TaskImpactEntry {
	taskId: string;
	impact: TaskImpact;
	/** Changes that affect this task */
	relatedChanges: SpecChange[];
	/** Reason for the impact classification */
	reason: string;
}

/** Full delta analysis result */
export interface DeltaAnalysis {
	/** Spec v1 ID */
	oldSpecId: string;
	/** Spec v2 ID */
	newSpecId: string;
	/** All detected changes */
	changes: SpecChange[];
	/** Impact per task */
	taskImpacts: TaskImpactEntry[];
	/** Summary counts */
	summary: {
		preserve: number;
		rebuild: number;
		new: number;
		remove: number;
		totalChanges: number;
	};
}

/**
 * Detect changes between two spec versions.
 */
export function detectChanges(oldSpec: OutputSpec, newSpec: OutputSpec): SpecChange[] {
	const changes: SpecChange[] = [];

	// Compare acceptance criteria
	const oldCriteria = new Map((oldSpec.acceptanceCriteria ?? []).map((c) => [c.id, c]));
	const newCriteria = new Map((newSpec.acceptanceCriteria ?? []).map((c) => [c.id, c]));

	// Added criteria
	for (const [id, criterion] of newCriteria) {
		if (!oldCriteria.has(id)) {
			changes.push({
				type: DeltaChangeType.CriterionAdded,
				path: `acceptance_criteria/${id}`,
				oldValue: null,
				newValue: criterion.description,
				affectedCriteriaIds: [id],
			});
		}
	}

	// Removed criteria
	for (const [id, criterion] of oldCriteria) {
		if (!newCriteria.has(id)) {
			changes.push({
				type: DeltaChangeType.CriterionRemoved,
				path: `acceptance_criteria/${id}`,
				oldValue: criterion.description,
				newValue: null,
				affectedCriteriaIds: [id],
			});
		}
	}

	// Modified criteria
	for (const [id, oldCriterion] of oldCriteria) {
		const newCriterion = newCriteria.get(id);
		if (newCriterion && oldCriterion.description !== newCriterion.description) {
			changes.push({
				type: DeltaChangeType.CriterionModified,
				path: `acceptance_criteria/${id}`,
				oldValue: oldCriterion.description,
				newValue: newCriterion.description,
				affectedCriteriaIds: [id],
			});
		}
	}

	// Compare deliverables
	const oldDeliverables = new Map((oldSpec.deliverables ?? []).map((d) => [d.id, d]));
	const newDeliverables = new Map((newSpec.deliverables ?? []).map((d) => [d.id, d]));

	for (const [id, deliverable] of newDeliverables) {
		if (!oldDeliverables.has(id)) {
			changes.push({
				type: DeltaChangeType.DeliverableAdded,
				path: `deliverables/${id}`,
				oldValue: null,
				newValue: deliverable.description,
				affectedCriteriaIds: [],
			});
		}
	}

	for (const [id, deliverable] of oldDeliverables) {
		if (!newDeliverables.has(id)) {
			changes.push({
				type: DeltaChangeType.DeliverableRemoved,
				path: `deliverables/${id}`,
				oldValue: deliverable.description,
				newValue: null,
				affectedCriteriaIds: [],
			});
		}
	}

	for (const [id, oldDel] of oldDeliverables) {
		const newDel = newDeliverables.get(id);
		if (newDel && oldDel.description !== newDel.description) {
			changes.push({
				type: DeltaChangeType.DeliverableModified,
				path: `deliverables/${id}`,
				oldValue: oldDel.description,
				newValue: newDel.description,
				affectedCriteriaIds: [],
			});
		}
	}

	// Compare constraints (metadata level)
	const oldConstraints = oldSpec.constraints;
	const newConstraints = newSpec.constraints;
	if (oldConstraints && newConstraints) {
		if (JSON.stringify(oldConstraints) !== JSON.stringify(newConstraints)) {
			changes.push({
				type: DeltaChangeType.ConstraintModified,
				path: "constraints",
				oldValue: JSON.stringify(oldConstraints),
				newValue: JSON.stringify(newConstraints),
				affectedCriteriaIds: [],
			});
		}
	}

	// Metadata changes (title, definition_of_done)
	if (oldSpec.title !== newSpec.title) {
		changes.push({
			type: DeltaChangeType.MetadataChanged,
			path: "title",
			oldValue: oldSpec.title,
			newValue: newSpec.title,
			affectedCriteriaIds: [],
		});
	}

	// Content-level comparison: if structured fields found nothing but raw YAML differs,
	// detect content change. This handles edits made in the SCR textarea where the YAML
	// is modified but structured fields (acceptanceCriteria, deliverables) aren't parsed.
	if (changes.length === 0 && oldSpec.content && newSpec.content) {
		const oldContent = (oldSpec.content ?? "").trim();
		const newContent = (newSpec.content ?? "").trim();
		if (oldContent !== newContent) {
			// Extract meaningful diff lines for display
			const oldLines = oldContent.split("\n");
			const newLines = newContent.split("\n");
			const addedLines = newLines.filter((l) => !oldLines.includes(l));
			const removedLines = oldLines.filter((l) => !newLines.includes(l));

			changes.push({
				type: DeltaChangeType.MetadataChanged,
				path: "content",
				oldValue:
					removedLines.length > 0
						? removedLines.slice(0, 5).join("\n") + (removedLines.length > 5 ? "\n..." : "")
						: "(no lines removed)",
				newValue:
					addedLines.length > 0
						? addedLines.slice(0, 5).join("\n") + (addedLines.length > 5 ? "\n..." : "")
						: "(no lines added)",
				affectedCriteriaIds: [],
			});
		}
	}

	return changes;
}

/**
 * Compute impact of changes on existing tasks.
 *
 * Maps changes to tasks via acceptance_criteria_ids linkage.
 */
export function computeTaskImpacts(
	changes: SpecChange[],
	existingTasks: PlanTask[],
): TaskImpactEntry[] {
	// Collect all affected criteria IDs
	const addedCriteria = new Set<string>();
	const removedCriteria = new Set<string>();
	const modifiedCriteria = new Set<string>();

	for (const change of changes) {
		for (const criteriaId of change.affectedCriteriaIds) {
			if (
				change.type === DeltaChangeType.CriterionAdded ||
				change.type === DeltaChangeType.DeliverableAdded
			) {
				addedCriteria.add(criteriaId);
			} else if (
				change.type === DeltaChangeType.CriterionRemoved ||
				change.type === DeltaChangeType.DeliverableRemoved
			) {
				removedCriteria.add(criteriaId);
			} else {
				modifiedCriteria.add(criteriaId);
			}
		}
	}

	const impacts: TaskImpactEntry[] = [];

	// If changes are content-level (no specific criteria IDs), all tasks need rebuild
	const hasContentChange = changes.some(
		(c) => c.path === "content" && c.affectedCriteriaIds.length === 0,
	);

	for (const task of existingTasks) {
		const taskCriteria = task.acceptanceCriteriaIds;
		const relatedChanges = changes.filter((c) =>
			c.affectedCriteriaIds.some((id) => taskCriteria.includes(id)),
		);

		// Check if all criteria for this task were removed
		const allRemoved =
			taskCriteria.length > 0 && taskCriteria.every((id) => removedCriteria.has(id));
		const anyModified = taskCriteria.some((id) => modifiedCriteria.has(id));
		const anyRemoved = taskCriteria.some((id) => removedCriteria.has(id));

		if (allRemoved) {
			impacts.push({
				taskId: task.id,
				impact: TaskImpact.Remove,
				relatedChanges,
				reason: "All acceptance criteria removed in new spec version",
			});
		} else if (anyModified || anyRemoved) {
			impacts.push({
				taskId: task.id,
				impact: TaskImpact.Rebuild,
				relatedChanges,
				reason: "Acceptance criteria modified or partially removed",
			});
		} else if (hasContentChange) {
			// Content-level change without structured criteria linkage —
			// conservatively mark all tasks for rebuild
			impacts.push({
				taskId: task.id,
				impact: TaskImpact.Rebuild,
				relatedChanges: changes,
				reason: "Spec content changed — task may be affected",
			});
		} else {
			impacts.push({
				taskId: task.id,
				impact: TaskImpact.Preserve,
				relatedChanges: [],
				reason: "No changes affect this task's acceptance criteria",
			});
		}
	}

	// Tasks for added criteria (NEW tasks needed)
	for (const criteriaId of addedCriteria) {
		// Only mark as NEW if no existing task covers this criteria
		const coveredByExisting = existingTasks.some((t) =>
			t.acceptanceCriteriaIds.includes(criteriaId),
		);
		if (!coveredByExisting) {
			const relatedChanges = changes.filter((c) => c.affectedCriteriaIds.includes(criteriaId));
			impacts.push({
				taskId: `NEW-${criteriaId}`,
				impact: TaskImpact.New,
				relatedChanges,
				reason: `New acceptance criterion ${criteriaId} requires a new task`,
			});
		}
	}

	return impacts;
}

/**
 * Run full delta analysis between two spec versions.
 */
export function analyzeSpecDelta(
	oldSpec: OutputSpec,
	newSpec: OutputSpec,
	existingTasks: PlanTask[],
): DeltaAnalysis {
	const changes = detectChanges(oldSpec, newSpec);
	const taskImpacts = computeTaskImpacts(changes, existingTasks);

	const summary = {
		preserve: taskImpacts.filter((t) => t.impact === TaskImpact.Preserve).length,
		rebuild: taskImpacts.filter((t) => t.impact === TaskImpact.Rebuild).length,
		new: taskImpacts.filter((t) => t.impact === TaskImpact.New).length,
		remove: taskImpacts.filter((t) => t.impact === TaskImpact.Remove).length,
		totalChanges: changes.length,
	};

	return {
		oldSpecId: oldSpec.id,
		newSpecId: newSpec.id,
		changes,
		taskImpacts,
		summary,
	};
}
