/**
 * RunsRepository — CRUD for Run documents with state machine enforcement.
 *
 * Partition key: /projectId
 *
 * State transitions are enforced via RUN_TRANSITIONS constant.
 * Invalid transitions return an error result.
 */

import type { Container } from "@azure/cosmos";
import { RUN_TRANSITIONS, type Result, type Run, type RunStatus } from "@blueflame/shared";
import { CosmosError } from "../errors.js";
import { Repository } from "../repository.js";

export class RunsRepository extends Repository<Run> {
	constructor(container: Container) {
		super(container, "runs");
	}

	/** Find all runs for a project, newest first */
	async findByProject(projectId: string): Promise<Run[]> {
		return this.queryAll(
			{
				query: "SELECT * FROM c WHERE c.projectId = @pid ORDER BY c.createdAt DESC",
				parameters: [{ name: "@pid", value: projectId }],
			},
			projectId,
		);
	}

	/**
	 * Transition a run's status. Validates against the state machine.
	 * Returns error if the transition is invalid.
	 */
	async transition(
		id: string,
		projectId: string,
		newStatus: RunStatus,
	): Promise<Result<Run, CosmosError>> {
		const readResult = await this.read(id, projectId);
		if (!readResult.ok) return readResult;

		const run = readResult.value;
		const allowed = RUN_TRANSITIONS[run.status];

		if (!allowed.includes(newStatus)) {
			return {
				ok: false,
				error: new CosmosError(
					`Invalid transition: ${run.status} → ${newStatus}. Allowed: [${allowed.join(", ")}]`,
					409,
				),
			};
		}

		const updated: Run = {
			...run,
			status: newStatus,
			startedAt:
				newStatus === "EXECUTING" ? (run.startedAt ?? new Date().toISOString()) : run.startedAt,
			endedAt: ["COMPLETED", "FAILED", "PARTIAL"].includes(newStatus)
				? new Date().toISOString()
				: run.endedAt,
		};

		return this.update(updated, projectId);
	}
}
