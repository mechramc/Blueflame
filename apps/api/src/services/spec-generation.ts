/**
 * Spec generation service — orchestrates spec creation from conversation.
 *
 * Calls the spec generator, creates an OutputSpec document, and stores it.
 * Uses Cosmos DB specs container via @blueflame/cosmos.
 */

import type { OutputSpec } from "@blueflame/shared";
import { SpecStatus } from "@blueflame/shared";
import { db } from "../db.js";

let specCounter = 0;

/**
 * Create an OutputSpec from generated YAML content.
 */
export async function createSpecFromYaml(
	projectId: string,
	yamlContent: string,
	createdBy: string,
): Promise<OutputSpec> {
	specCounter += 1;
	const specId = `spec-${projectId}-${Date.now()}-${specCounter}`;
	const now = new Date().toISOString();

	const spec: OutputSpec = {
		id: specId,
		projectId,
		specId,
		version: 1,
		status: SpecStatus.Draft,
		specHash: null,
		title: extractYamlField(yamlContent, "title") ?? "Untitled Spec",
		description: extractYamlField(yamlContent, "description") ?? "",
		deliverables: [],
		acceptanceCriteria: [],
		constraints: { must: [], mustNot: [] },
		nonGoals: [],
		risks: [],
		definitionOfDone: extractYamlField(yamlContent, "definition_of_done") ?? "",
		inheritedConstraints: [],
		content: yamlContent,
		createdAt: now,
		updatedAt: now,
		createdBy,
	};

	const result = await db.specs.create(spec, projectId);
	if (!result.ok) {
		throw new Error(`Failed to create spec: ${result.error.message}`);
	}

	// Increment project specCount
	incrementProjectStat(projectId, "specCount").catch((err) =>
		console.error("[SpecGeneration] Failed to increment specCount:", err),
	);

	return result.value;
}

/**
 * Get a spec by ID.
 */
export async function getSpec(specId: string, projectId?: string): Promise<OutputSpec | undefined> {
	if (!projectId) {
		// Cross-partition query fallback
		const results = await db.specs.queryAll({
			query: "SELECT * FROM c WHERE c.id = @id",
			parameters: [{ name: "@id", value: specId }],
		});
		return results[0];
	}
	const result = await db.specs.read(specId, projectId);
	return result.ok ? result.value : undefined;
}

/**
 * Get the latest spec for a project.
 */
export async function getLatestSpec(projectId: string): Promise<OutputSpec | undefined> {
	const specs = await db.specs.findByProject(projectId);
	return specs[0]; // findByProject orders by createdAt DESC
}

/**
 * Update a spec's content (only if DRAFT).
 */
export async function updateSpecContent(
	specId: string,
	content: string,
	projectId?: string,
): Promise<OutputSpec | undefined> {
	const spec = await getSpec(specId, projectId);
	if (!spec || spec.status !== SpecStatus.Draft) return undefined;

	spec.content = content;
	spec.updatedAt = new Date().toISOString();

	const result = await db.specs.update(spec, spec.projectId);
	return result.ok ? result.value : undefined;
}

/**
 * Accept a spec (DRAFT → ACCEPTED).
 */
export async function acceptSpec(
	specId: string,
	projectId?: string,
): Promise<OutputSpec | undefined> {
	const spec = await getSpec(specId, projectId);
	if (!spec || spec.status !== SpecStatus.Draft) return undefined;

	spec.status = SpecStatus.Accepted;
	spec.updatedAt = new Date().toISOString();

	const result = await db.specs.update(spec, spec.projectId);
	return result.ok ? result.value : undefined;
}

/**
 * Clear all specs (for testing — no-op in production, tests mock db).
 */
export function clearAllSpecs(): void {
	specCounter = 0;
}

/**
 * Increment a numeric stat on a project document (fire-and-forget).
 */
async function incrementProjectStat(
	projectId: string,
	field: "specCount" | "runCount",
): Promise<void> {
	const result = await db.projects.read(projectId, projectId);
	if (!result.ok) return;
	const project = result.value;
	project[field] = (project[field] ?? 0) + 1;
	project.lastActivityAt = new Date().toISOString();
	await db.projects.update(project, projectId);
}

/** Exported for use by orchestrator */
export { incrementProjectStat };

/**
 * Simple YAML field extractor (no dependency on yaml parser for MVP).
 */
function extractYamlField(yaml: string, field: string): string | undefined {
	const regex = new RegExp(`^${field}:\\s*"?(.+?)"?\\s*$`, "m");
	const match = yaml.match(regex);
	return match?.[1];
}
