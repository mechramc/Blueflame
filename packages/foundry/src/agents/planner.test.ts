import { describe, expect, it } from "vitest";
import { type RawPlanTask, parsePlanOutput, validateDAG } from "./planner.js";
import { PLANNER_SYSTEM_PROMPT } from "./prompts/planner-system.js";

describe("Planner Agent", () => {
	describe("PLANNER_SYSTEM_PROMPT", () => {
		it("should require JSON output format", () => {
			expect(PLANNER_SYSTEM_PROMPT).toContain("valid JSON");
		});

		it("should specify task ID format (TASK-001)", () => {
			expect(PLANNER_SYSTEM_PROMPT).toContain("TASK-001");
		});

		it("should require DAG with no cycles", () => {
			expect(PLANNER_SYSTEM_PROMPT).toContain("NO CYCLES");
		});

		it("should define agent roles", () => {
			expect(PLANNER_SYSTEM_PROMPT).toContain("BUILDER");
			expect(PLANNER_SYSTEM_PROMPT).toContain("VERIFIER");
			expect(PLANNER_SYSTEM_PROMPT).toContain("EXPLAINER");
		});

		it("should define sigma estimates", () => {
			expect(PLANNER_SYSTEM_PROMPT).toContain("sigma_estimate");
			expect(PLANNER_SYSTEM_PROMPT).toContain("self-consistency variance");
		});
	});

	describe("parsePlanOutput", () => {
		const validPlan = JSON.stringify({
			tasks: [
				{
					id: "TASK-001",
					description: "Set up project structure",
					acceptance_criteria_ids: ["AC-001"],
					dependencies: [],
					agent_role: "BUILDER",
					estimated_tokens: 5000,
					estimated_cost: 0.05,
					sigma_estimate: 0.2,
					parallelizable: true,
				},
			],
			total_estimated_cost: 0.05,
			total_estimated_tokens: 5000,
		});

		it("should parse valid JSON output", () => {
			const result = parsePlanOutput(validPlan);
			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0].id).toBe("TASK-001");
			expect(result.total_estimated_cost).toBe(0.05);
		});

		it("should strip markdown code fences", () => {
			const wrapped = `\`\`\`json\n${validPlan}\n\`\`\``;
			const result = parsePlanOutput(wrapped);
			expect(result.tasks).toHaveLength(1);
		});

		it("should strip bare code fences", () => {
			const wrapped = `\`\`\`\n${validPlan}\n\`\`\``;
			const result = parsePlanOutput(wrapped);
			expect(result.tasks).toHaveLength(1);
		});

		it("should throw on empty tasks array", () => {
			const empty = JSON.stringify({
				tasks: [],
				total_estimated_cost: 0,
				total_estimated_tokens: 0,
			});
			expect(() => parsePlanOutput(empty)).toThrow("at least one task");
		});

		it("should throw on invalid JSON", () => {
			expect(() => parsePlanOutput("not json")).toThrow();
		});
	});

	describe("validateDAG", () => {
		it("should accept a valid DAG", () => {
			const tasks: RawPlanTask[] = [
				makePlanTask("TASK-001", []),
				makePlanTask("TASK-002", ["TASK-001"]),
				makePlanTask("TASK-003", ["TASK-001", "TASK-002"]),
			];
			expect(validateDAG(tasks)).toEqual([]);
		});

		it("should detect unknown dependencies", () => {
			const tasks: RawPlanTask[] = [makePlanTask("TASK-001", ["TASK-999"])];
			const errors = validateDAG(tasks);
			expect(errors.some((e) => e.includes("unknown task TASK-999"))).toBe(true);
		});

		it("should detect cycles (A→B→A)", () => {
			const tasks: RawPlanTask[] = [
				makePlanTask("TASK-001", ["TASK-002"]),
				makePlanTask("TASK-002", ["TASK-001"]),
			];
			const errors = validateDAG(tasks);
			expect(errors.some((e) => e.includes("cycle"))).toBe(true);
		});

		it("should detect indirect cycles (A→B→C→A)", () => {
			const tasks: RawPlanTask[] = [
				makePlanTask("TASK-001", ["TASK-003"]),
				makePlanTask("TASK-002", ["TASK-001"]),
				makePlanTask("TASK-003", ["TASK-002"]),
			];
			const errors = validateDAG(tasks);
			expect(errors.some((e) => e.includes("cycle"))).toBe(true);
		});

		it("should accept tasks with no dependencies", () => {
			const tasks: RawPlanTask[] = [makePlanTask("TASK-001", []), makePlanTask("TASK-002", [])];
			expect(validateDAG(tasks)).toEqual([]);
		});

		it("should accept diamond dependencies", () => {
			const tasks: RawPlanTask[] = [
				makePlanTask("TASK-001", []),
				makePlanTask("TASK-002", ["TASK-001"]),
				makePlanTask("TASK-003", ["TASK-001"]),
				makePlanTask("TASK-004", ["TASK-002", "TASK-003"]),
			];
			expect(validateDAG(tasks)).toEqual([]);
		});
	});
});

function makePlanTask(id: string, dependencies: string[]): RawPlanTask {
	return {
		id,
		description: `Task ${id}`,
		acceptance_criteria_ids: [],
		dependencies,
		agent_role: "BUILDER",
		estimated_tokens: 1000,
		estimated_cost: 0.01,
		sigma_estimate: 0.3,
		parallelizable: dependencies.length === 0,
	};
}
