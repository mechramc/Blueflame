/**
 * Spec generation service — orchestrates spec creation from conversation.
 *
 * Calls the spec generator, creates an OutputSpec document, and stores it.
 * For MVP, uses in-memory store. Production will use Cosmos DB specs container.
 */

import type { OutputSpec } from "@blueflame/shared";
import { SpecStatus } from "@blueflame/shared";

/** In-memory spec store for MVP */
const specs = new Map<string, OutputSpec>();
let specCounter = 0;

/**
 * Create an OutputSpec from generated YAML content.
 */
export function createSpecFromYaml(
	projectId: string,
	yamlContent: string,
	createdBy: string,
): OutputSpec {
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

	specs.set(specId, spec);
	return spec;
}

/**
 * Get a spec by ID.
 */
export function getSpec(specId: string): OutputSpec | undefined {
	return specs.get(specId);
}

/**
 * Get the latest spec for a project.
 */
export function getLatestSpec(projectId: string): OutputSpec | undefined {
	let latest: OutputSpec | undefined;
	for (const spec of specs.values()) {
		if (spec.projectId === projectId) {
			if (!latest || spec.createdAt >= latest.createdAt) {
				latest = spec;
			}
		}
	}
	return latest;
}

/**
 * Update a spec's content (only if DRAFT).
 */
export function updateSpecContent(specId: string, content: string): OutputSpec | undefined {
	const spec = specs.get(specId);
	if (!spec || spec.status !== SpecStatus.Draft) return undefined;
	spec.content = content;
	spec.updatedAt = new Date().toISOString();
	return spec;
}

/**
 * Accept a spec (DRAFT → ACCEPTED).
 */
export function acceptSpec(specId: string): OutputSpec | undefined {
	const spec = specs.get(specId);
	if (!spec || spec.status !== SpecStatus.Draft) return undefined;
	spec.status = SpecStatus.Accepted;
	spec.updatedAt = new Date().toISOString();
	return spec;
}

/**
 * Clear all specs (for testing).
 */
export function clearAllSpecs(): void {
	specs.clear();
	specCounter = 0;
}

/**
 * Simple YAML field extractor (no dependency on yaml parser for MVP).
 */
function extractYamlField(yaml: string, field: string): string | undefined {
	const regex = new RegExp(`^${field}:\\s*"?(.+?)"?\\s*$`, "m");
	const match = yaml.match(regex);
	return match?.[1];
}
