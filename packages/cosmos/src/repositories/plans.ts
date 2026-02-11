/**
 * PlansRepository — CRUD for TaskPlan documents.
 *
 * Partition key: /runId
 */

import type { Container } from "@azure/cosmos";
import type { TaskPlan } from "@blueflame/shared";
import { Repository } from "../repository.js";

export class PlansRepository extends Repository<TaskPlan> {
	constructor(container: Container) {
		super(container, "plans");
	}

	/** Find the plan for a given run */
	async findByRun(runId: string): Promise<TaskPlan | null> {
		const results = await this.queryAll(
			{
				query: "SELECT * FROM c WHERE c.runId = @rid",
				parameters: [{ name: "@rid", value: runId }],
			},
			runId,
		);
		return results[0] ?? null;
	}
}
