/**
 * FailuresRepository — CRUD for NormalizedFailure documents.
 *
 * Partition key: /projectId
 * TTL: 30 days (2592000 seconds) — auto-cleanup of old failures.
 */

import type { Container } from "@azure/cosmos";
import type { NormalizedFailure } from "@blueflame/shared";
import { Repository } from "../repository.js";

export class FailuresRepository extends Repository<NormalizedFailure> {
	constructor(container: Container) {
		super(container, "failures");
	}

	/** Find all failures for a given project */
	async findByProject(projectId: string): Promise<NormalizedFailure[]> {
		return this.queryAll(
			{
				query: "SELECT * FROM c WHERE c.projectId = @pid ORDER BY c.timestamp DESC",
				parameters: [{ name: "@pid", value: projectId }],
			},
			projectId,
		);
	}

	/** Find all failures for a given run */
	async findByRun(runId: string, projectId: string): Promise<NormalizedFailure[]> {
		return this.queryAll(
			{
				query:
					"SELECT * FROM c WHERE c.runId = @rid AND c.projectId = @pid ORDER BY c.timestamp DESC",
				parameters: [
					{ name: "@rid", value: runId },
					{ name: "@pid", value: projectId },
				],
			},
			projectId,
		);
	}

	/** Find failures by source (azure-devops or github-actions) */
	async findBySource(source: string, projectId: string): Promise<NormalizedFailure[]> {
		return this.queryAll(
			{
				query:
					"SELECT * FROM c WHERE c.source = @src AND c.projectId = @pid ORDER BY c.timestamp DESC",
				parameters: [
					{ name: "@src", value: source },
					{ name: "@pid", value: projectId },
				],
			},
			projectId,
		);
	}
}
