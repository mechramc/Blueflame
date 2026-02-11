/**
 * ConstraintsRepository — CRUD for Constraint documents.
 *
 * Partition key: /projectId
 */

import type { Container } from "@azure/cosmos";
import type { Constraint } from "@blueflame/shared";
import { Repository } from "../repository.js";

export class ConstraintsRepository extends Repository<Constraint> {
	constructor(container: Container) {
		super(container, "constraints");
	}

	/** Find all constraints for a project */
	async findByProject(projectId: string): Promise<Constraint[]> {
		return this.queryAll(
			{
				query: "SELECT * FROM c WHERE c.projectId = @pid ORDER BY c.createdAt ASC",
				parameters: [{ name: "@pid", value: projectId }],
			},
			projectId,
		);
	}
}
