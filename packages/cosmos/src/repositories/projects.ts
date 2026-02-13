/**
 * ProjectsRepository — CRUD for Project documents.
 *
 * Partition key: /id (single-tenant for hackathon).
 * Future: migrate to /orgId for multi-tenant and portfolio-level partitioning.
 */

import type { Container } from "@azure/cosmos";
import type { Project } from "@blueflame/shared";
import { Repository } from "../repository.js";

export class ProjectsRepository extends Repository<Project & { id: string }> {
	constructor(container: Container) {
		super(container, "projects");
	}

	/** Find all active projects, ordered by last activity */
	async findAll(): Promise<Project[]> {
		return this.queryAll({
			query:
				"SELECT * FROM c WHERE NOT IS_DEFINED(c.status) OR c.status != 'archived' ORDER BY c.lastActivityAt DESC",
		});
	}

	/** Search projects by name or description */
	async search(query: string): Promise<Project[]> {
		return this.queryAll({
			query:
				"SELECT * FROM c WHERE CONTAINS(LOWER(c.name), @q) OR CONTAINS(LOWER(c.description), @q) ORDER BY c.lastActivityAt DESC",
			parameters: [{ name: "@q", value: query.toLowerCase() }],
		});
	}
}
