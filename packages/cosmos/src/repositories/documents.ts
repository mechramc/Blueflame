/**
 * DocumentsRepository — CRUD for UploadedDocument metadata.
 *
 * Partition key: /projectId
 */

import type { Container } from "@azure/cosmos";
import type { UploadedDocument } from "@blueflame/shared";
import { Repository } from "../repository.js";

export class DocumentsRepository extends Repository<UploadedDocument> {
	constructor(container: Container) {
		super(container, "documents");
	}

	/** Find all documents for a project */
	async findByProject(projectId: string): Promise<UploadedDocument[]> {
		return this.queryAll(
			{
				query: "SELECT * FROM c WHERE c.projectId = @pid ORDER BY c.uploadedAt DESC",
				parameters: [{ name: "@pid", value: projectId }],
			},
			projectId,
		);
	}
}
