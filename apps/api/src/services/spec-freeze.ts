/**
 * Spec freeze service — computes SHA-256 hash, sets status to FROZEN,
 * increments version, and prevents further edits.
 */

import { SpecStatus } from "@blueflame/shared";
import type { OutputSpec, Result } from "@blueflame/shared";
import { sha256 } from "@blueflame/shared/utils/hash";
import { createSpecFromYaml, getSpec } from "./spec-generation.js";

/**
 * Freeze a spec: compute hash, set FROZEN, increment version.
 * Returns error if spec is not in ACCEPTED status.
 */
export function freezeSpec(specId: string): Result<OutputSpec> {
	const spec = getSpec(specId);
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

	spec.specHash = sha256(spec.content);
	spec.status = SpecStatus.Frozen;
	spec.version += 1;
	spec.updatedAt = new Date().toISOString();

	return { ok: true, value: spec };
}

/**
 * Edit a frozen spec — creates a new version (v+1) as DRAFT.
 * The original frozen spec is not modified.
 */
export function editFrozenSpec(
	specId: string,
	newContent: string,
	editedBy: string,
): Result<OutputSpec> {
	const original = getSpec(specId);
	if (!original) {
		return { ok: false, error: new Error(`Spec not found: ${specId}`) };
	}

	if (original.status !== SpecStatus.Frozen) {
		return {
			ok: false,
			error: new Error("Only frozen specs can be versioned via edit"),
		};
	}

	const newSpec = createSpecFromYaml(original.projectId, newContent, editedBy);
	newSpec.version = original.version + 1;

	return { ok: true, value: newSpec };
}
