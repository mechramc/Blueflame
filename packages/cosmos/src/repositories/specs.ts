/**
 * SpecsRepository — CRUD for OutputSpec documents.
 *
 * Partition key: /projectId
 * Special: freeze() computes SHA-256 hash and sets status to FROZEN.
 */

import { createHash } from "node:crypto";
import type { Container } from "@azure/cosmos";
import { type OutputSpec, type Result, SpecStatus } from "@blueflame/shared";
import type { CosmosError } from "../errors.js";
import { NotFoundError } from "../errors.js";
import { Repository } from "../repository.js";

export class SpecsRepository extends Repository<OutputSpec> {
	constructor(container: Container) {
		super(container, "specs");
	}

	/** Find all specs for a project */
	async findByProject(projectId: string): Promise<OutputSpec[]> {
		return this.queryAll(
			{
				query: "SELECT * FROM c WHERE c.projectId = @pid ORDER BY c.createdAt DESC",
				parameters: [{ name: "@pid", value: projectId }],
			},
			projectId,
		);
	}

	/**
	 * Freeze a spec: compute SHA-256 hash, set status to FROZEN, increment version.
	 * Returns error if spec is already frozen or not found.
	 */
	async freeze(specId: string, projectId: string): Promise<Result<OutputSpec, CosmosError>> {
		const readResult = await this.read(specId, projectId);
		if (!readResult.ok) return readResult;

		const spec = readResult.value;

		if (spec.status === SpecStatus.Frozen) {
			return {
				ok: false,
				error: new NotFoundError("specs", specId, projectId),
			};
		}

		const hash = createHash("sha256").update(spec.content).digest("hex");

		const frozen: OutputSpec = {
			...spec,
			status: SpecStatus.Frozen,
			specHash: hash,
			version: spec.version + 1,
			updatedAt: new Date().toISOString(),
		};

		return this.update(frozen, projectId);
	}
}
