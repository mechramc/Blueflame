/**
 * AgentsRepository — CRUD for AgentState documents.
 *
 * Partition key: /runId
 */

import type { Container } from "@azure/cosmos";
import type { AgentState } from "@blueflame/shared";
import { Repository } from "../repository.js";

export class AgentsRepository extends Repository<AgentState> {
	constructor(container: Container) {
		super(container, "agents");
	}

	/** Find all agents for a given run */
	async findByRun(runId: string): Promise<AgentState[]> {
		return this.queryAll(
			{
				query: "SELECT * FROM c WHERE c.runId = @rid ORDER BY c.createdAt ASC",
				parameters: [{ name: "@rid", value: runId }],
			},
			runId,
		);
	}
}
