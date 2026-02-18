/**
 * Planner Agent — task decomposition from frozen specs via Foundry Models.
 *
 * Takes a frozen OutputSpec and produces a raw task plan JSON
 * with dependency DAG, cost estimates, and agent role assignments.
 */

import OpenAI from "openai";
import { PLANNER_SYSTEM_PROMPT } from "./prompts/planner-system.js";
import { getAzureBaseURL } from "../routing/types.js";

export interface PlannerConfig {
	/** Azure OpenAI or Foundry endpoint */
	endpoint: string;
	/** API key */
	apiKey: string;
	/** Deployment name (e.g., "gpt-4o") */
	deployment: string;
	/** API version (default: "2024-12-01-preview") */
	apiVersion?: string;
}

/** Raw task from Planner LLM output */
export interface RawPlanTask {
	id: string;
	description: string;
	acceptance_criteria_ids: string[];
	dependencies: string[];
	agent_role: string;
	estimated_tokens: number;
	estimated_cost: number;
	sigma_estimate: number;
	parallelizable: boolean;
}

/** Raw plan output from Planner LLM */
export interface RawPlanOutput {
	tasks: RawPlanTask[];
	total_estimated_cost: number;
	total_estimated_tokens: number;
}

/**
 * Creates an Azure OpenAI client configured for the Planner agent.
 */
function createClient(config: PlannerConfig): OpenAI {
	return new OpenAI({
		apiKey: config.apiKey,
		baseURL: getAzureBaseURL(config.endpoint, config.deployment),
		defaultQuery: { "api-version": config.apiVersion ?? "2024-12-01-preview" },
		defaultHeaders: { "api-key": config.apiKey },
	});
}

/**
 * Calls the Planner LLM to decompose a frozen spec into tasks.
 *
 * @param config - Azure OpenAI configuration
 * @param specContent - The raw YAML content of the frozen spec
 * @returns Parsed plan output with tasks, costs, and token estimates
 */
export async function generatePlan(
	config: PlannerConfig,
	specContent: string,
): Promise<RawPlanOutput> {
	const client = createClient(config);

	const response = await client.chat.completions.create({
		model: config.deployment,
		messages: [
			{ role: "system", content: PLANNER_SYSTEM_PROMPT },
			{
				role: "user",
				content: `Decompose the following frozen specification into implementation tasks:\n\n${specContent}`,
			},
		],
		temperature: 0.3,
		max_tokens: 4096,
	});

	const content = response.choices[0]?.message?.content ?? "";
	return parsePlanOutput(content);
}

/**
 * Parses the raw LLM output into a structured plan.
 * Strips markdown fences if present and validates basic structure.
 */
export function parsePlanOutput(raw: string): RawPlanOutput {
	const cleaned = cleanJsonOutput(raw);
	const parsed = JSON.parse(cleaned) as RawPlanOutput;

	if (!Array.isArray(parsed.tasks) || parsed.tasks.length === 0) {
		throw new Error("Plan must contain at least one task");
	}

	return parsed;
}

/**
 * Strips markdown code fences from LLM output.
 */
function cleanJsonOutput(raw: string): string {
	let cleaned = raw.trim();
	if (cleaned.startsWith("```json")) {
		cleaned = cleaned.slice(7);
	} else if (cleaned.startsWith("```")) {
		cleaned = cleaned.slice(3);
	}
	if (cleaned.endsWith("```")) {
		cleaned = cleaned.slice(0, -3);
	}
	return cleaned.trim();
}

/**
 * Validates that a plan's dependencies form a valid DAG (no cycles).
 * Returns an array of error messages (empty = valid).
 */
export function validateDAG(tasks: RawPlanTask[]): string[] {
	const errors: string[] = [];
	const taskIds = new Set(tasks.map((t) => t.id));

	for (const task of tasks) {
		for (const dep of task.dependencies) {
			if (!taskIds.has(dep)) {
				errors.push(`Task ${task.id} depends on unknown task ${dep}`);
			}
		}
	}

	// Topological sort cycle detection using Kahn's algorithm
	const inDegree = new Map<string, number>();
	const adjacency = new Map<string, string[]>();

	for (const task of tasks) {
		inDegree.set(task.id, 0);
		adjacency.set(task.id, []);
	}

	for (const task of tasks) {
		for (const dep of task.dependencies) {
			if (taskIds.has(dep)) {
				adjacency.get(dep)?.push(task.id);
				inDegree.set(task.id, (inDegree.get(task.id) ?? 0) + 1);
			}
		}
	}

	const queue: string[] = [];
	for (const [id, degree] of inDegree) {
		if (degree === 0) {
			queue.push(id);
		}
	}

	let visited = 0;
	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) break;
		visited++;
		for (const neighbor of adjacency.get(current) ?? []) {
			const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
			inDegree.set(neighbor, newDegree);
			if (newDegree === 0) {
				queue.push(neighbor);
			}
		}
	}

	if (visited < tasks.length) {
		errors.push("Dependency graph contains a cycle");
	}

	return errors;
}
