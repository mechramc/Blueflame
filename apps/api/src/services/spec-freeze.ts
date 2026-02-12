/**
 * Spec freeze service — computes SHA-256 hash, sets status to FROZEN,
 * increments version, and prevents further edits.
 *
 * Uses Cosmos DB specs container via db singleton.
 */

import { SpecStatus } from "@blueflame/shared";
import type { OutputSpec, Result } from "@blueflame/shared";
import { db } from "../db.js";
import { createSpecFromYaml, getSpec } from "./spec-generation.js";

/**
 * Freeze a spec: compute hash, set FROZEN, increment version.
 * Returns error if spec is not in ACCEPTED status.
 */
export async function freezeSpec(specId: string): Promise<Result<OutputSpec>> {
	const spec = await getSpec(specId);
	if (!spec) {
		return { ok: false, error: new Error(`Spec not found: ${specId}`) };
	}

	if (spec.status === SpecStatus.Frozen) {
		return { ok: false, error: new Error("Spec is already frozen") };
	}

	if (spec.status !== SpecStatus.Accepted) {
		return {
			ok: false,
			error: new Error(`Spec must be ACCEPTED before freezing (current: ${spec.status})`),
		};
	}

	// Use the Cosmos repository's freeze method which handles hash + update atomically
	const result = await db.specs.freeze(specId, spec.projectId);
	if (!result.ok) {
		return { ok: false, error: new Error(result.error.message) };
	}

	return { ok: true, value: result.value };
}

/**
 * Edit a frozen spec — creates a new version (v+1) as DRAFT.
 * The original frozen spec is not modified.
 */
export async function editFrozenSpec(
	specId: string,
	newContent: string,
	editedBy: string,
): Promise<Result<OutputSpec>> {
	const original = await getSpec(specId);
	if (!original) {
		return { ok: false, error: new Error(`Spec not found: ${specId}`) };
	}

	if (original.status !== SpecStatus.Frozen) {
		return {
			ok: false,
			error: new Error("Only frozen specs can be versioned via edit"),
		};
	}

	const newSpec = await createSpecFromYaml(original.projectId, newContent, editedBy);
	newSpec.version = original.version + 1;

	// Update the version in Cosmos
	const updateResult = await db.specs.update(newSpec, newSpec.projectId);
	if (!updateResult.ok) {
		return { ok: false, error: new Error(updateResult.error.message) };
	}

	return { ok: true, value: updateResult.value };
}
