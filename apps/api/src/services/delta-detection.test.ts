import type { OutputSpec, PlanTask } from "@blueflame/shared";
import { AgentRole, SpecStatus, TaskStatus } from "@blueflame/shared";
import { describe, expect, it } from "vitest";

import {
	DeltaChangeType,
	TaskImpact,
	analyzeSpecDelta,
	computeTaskImpacts,
	detectChanges,
} from "./delta-detection.js";

function makeSpec(overrides?: Partial<OutputSpec>): OutputSpec {
	return {
		id: "spec-1",
		projectId: "proj-1",
		specId: "spec-1",
		version: 1,
		status: SpecStatus.Frozen,
		specHash: "abc123",
		title: "Test Spec",
		description: "A test specification",
		deliverables: [{ id: "DEL-001", description: "Deliverable 1", artifacts: ["src/main.ts"] }],
		acceptanceCriteria: [
			{ id: "AC-001", description: "Feature A works", verificationMethod: "test" },
			{ id: "AC-002", description: "Feature B works", verificationMethod: "test" },
		],
		constraints: { must: ["Use TypeScript"], mustNot: ["Use any"] },
		nonGoals: [],
		risks: [],
		definitionOfDone: "All AC pass",
		inheritedConstraints: [],
		content: "yaml content",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		createdBy: "user-1",
		...overrides,
	};
}

function makeTask(overrides?: Partial<PlanTask>): PlanTask {
	return {
		id: "TASK-001",
		description: "Task 1",
		acceptanceCriteriaIds: ["AC-001"],
		dependencies: [],
		agentRole: AgentRole.Builder,
		estimatedTokens: 1000,
		estimatedCost: 0.01,
		sigmaEstimate: 0.1,
		parallelizable: true,
		status: TaskStatus.Completed,
		...overrides,
	};
}

describe("detectChanges", () => {
	it("should detect no changes for identical specs", () => {
		const spec = makeSpec();
		const changes = detectChanges(spec, spec);
		expect(changes).toHaveLength(0);
	});

	it("should detect added criterion", () => {
		const oldSpec = makeSpec();
		const newSpec = makeSpec({
			acceptanceCriteria: [
				...oldSpec.acceptanceCriteria,
				{ id: "AC-003", description: "Feature C works", verificationMethod: "test" },
			],
		});

		const changes = detectChanges(oldSpec, newSpec);
		const added = changes.filter((c) => c.type === DeltaChangeType.CriterionAdded);
		expect(added).toHaveLength(1);
		expect(added[0]?.affectedCriteriaIds).toContain("AC-003");
	});

	it("should detect removed criterion", () => {
		const oldSpec = makeSpec();
		const newSpec = makeSpec({
			acceptanceCriteria: [oldSpec.acceptanceCriteria[0]!],
		});

		const changes = detectChanges(oldSpec, newSpec);
		const removed = changes.filter((c) => c.type === DeltaChangeType.CriterionRemoved);
		expect(removed).toHaveLength(1);
		expect(removed[0]?.affectedCriteriaIds).toContain("AC-002");
	});

	it("should detect modified criterion", () => {
		const oldSpec = makeSpec();
		const newSpec = makeSpec({
			acceptanceCriteria: [
				{ id: "AC-001", description: "Feature A works differently", verificationMethod: "test" },
				oldSpec.acceptanceCriteria[1]!,
			],
		});

		const changes = detectChanges(oldSpec, newSpec);
		const modified = changes.filter((c) => c.type === DeltaChangeType.CriterionModified);
		expect(modified).toHaveLength(1);
		expect(modified[0]?.affectedCriteriaIds).toContain("AC-001");
	});

	it("should detect title change as metadata", () => {
		const oldSpec = makeSpec();
		const newSpec = makeSpec({ title: "Updated Title" });

		const changes = detectChanges(oldSpec, newSpec);
		const meta = changes.filter((c) => c.type === DeltaChangeType.MetadataChanged);
		expect(meta).toHaveLength(1);
		expect(meta[0]?.path).toBe("title");
	});

	it("should detect added deliverable", () => {
		const oldSpec = makeSpec();
		const newSpec = makeSpec({
			deliverables: [
				...oldSpec.deliverables,
				{ id: "DEL-002", description: "New deliverable", artifacts: ["src/new.ts"] },
			],
		});

		const changes = detectChanges(oldSpec, newSpec);
		const added = changes.filter((c) => c.type === DeltaChangeType.DeliverableAdded);
		expect(added).toHaveLength(1);
	});

	it("should detect constraint modification", () => {
		const oldSpec = makeSpec();
		const newSpec = makeSpec({
			constraints: { must: ["Use TypeScript", "Use Zod"], mustNot: ["Use any"] },
		});

		const changes = detectChanges(oldSpec, newSpec);
		const constChanged = changes.filter((c) => c.type === DeltaChangeType.ConstraintModified);
		expect(constChanged).toHaveLength(1);
	});
});

describe("computeTaskImpacts", () => {
	it("should preserve unaffected tasks", () => {
		const impacts = computeTaskImpacts([], [makeTask()]);
		expect(impacts).toHaveLength(1);
		expect(impacts[0]?.impact).toBe(TaskImpact.Preserve);
	});

	it("should rebuild tasks with modified criteria", () => {
		const changes = [
			{
				type: DeltaChangeType.CriterionModified,
				path: "acceptance_criteria/AC-001",
				oldValue: "old",
				newValue: "new",
				affectedCriteriaIds: ["AC-001"],
			},
		];

		const impacts = computeTaskImpacts(changes, [makeTask()]);
		expect(impacts[0]?.impact).toBe(TaskImpact.Rebuild);
	});

	it("should remove tasks when all criteria deleted", () => {
		const changes = [
			{
				type: DeltaChangeType.CriterionRemoved,
				path: "acceptance_criteria/AC-001",
				oldValue: "old",
				newValue: null,
				affectedCriteriaIds: ["AC-001"],
			},
		];

		const impacts = computeTaskImpacts(changes, [makeTask()]);
		expect(impacts[0]?.impact).toBe(TaskImpact.Remove);
	});

	it("should create NEW entries for uncovered added criteria", () => {
		const changes = [
			{
				type: DeltaChangeType.CriterionAdded,
				path: "acceptance_criteria/AC-099",
				oldValue: null,
				newValue: "New criterion",
				affectedCriteriaIds: ["AC-099"],
			},
		];

		const impacts = computeTaskImpacts(changes, [makeTask()]);
		const newImpacts = impacts.filter((i) => i.impact === TaskImpact.New);
		expect(newImpacts).toHaveLength(1);
		expect(newImpacts[0]?.taskId).toBe("NEW-AC-099");
	});
});

describe("analyzeSpecDelta", () => {
	it("should produce full delta analysis", () => {
		const oldSpec = makeSpec();
		const newSpec = makeSpec({
			acceptanceCriteria: [
				{ id: "AC-001", description: "Feature A updated", verificationMethod: "test" },
				{ id: "AC-003", description: "Feature C new", verificationMethod: "test" },
			],
		});

		const tasks = [
			makeTask({ id: "TASK-001", acceptanceCriteriaIds: ["AC-001"] }),
			makeTask({ id: "TASK-002", acceptanceCriteriaIds: ["AC-002"] }),
		];

		const analysis = analyzeSpecDelta(oldSpec, newSpec, tasks);

		expect(analysis.changes.length).toBeGreaterThan(0);
		expect(analysis.summary.totalChanges).toBeGreaterThan(0);
		expect(analysis.oldSpecId).toBe("spec-1");
		expect(analysis.newSpecId).toBe("spec-1");

		// TASK-001: AC-001 modified → REBUILD
		const task1Impact = analysis.taskImpacts.find((t) => t.taskId === "TASK-001");
		expect(task1Impact?.impact).toBe(TaskImpact.Rebuild);

		// TASK-002: AC-002 removed → REMOVE
		const task2Impact = analysis.taskImpacts.find((t) => t.taskId === "TASK-002");
		expect(task2Impact?.impact).toBe(TaskImpact.Remove);

		// AC-003 new → NEW task needed
		const newTasks = analysis.taskImpacts.filter((t) => t.impact === TaskImpact.New);
		expect(newTasks.length).toBeGreaterThan(0);
	});

	it("should produce zero-change analysis for identical specs", () => {
		const spec = makeSpec();
		const analysis = analyzeSpecDelta(spec, spec, [makeTask()]);

		expect(analysis.summary.totalChanges).toBe(0);
		expect(analysis.summary.preserve).toBe(1);
		expect(analysis.summary.rebuild).toBe(0);
		expect(analysis.summary.new).toBe(0);
		expect(analysis.summary.remove).toBe(0);
	});
});
