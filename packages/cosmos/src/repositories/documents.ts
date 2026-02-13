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

	/** Find documents by type within a project partition */
	async findByType(projectId: string, type: string): Promise<UploadedDocument[]> {
		return this.queryAll(
			{
				query: "SELECT * FROM c WHERE c.projectId = @pid AND c.type = @type ORDER BY c._ts DESC",
				parameters: [
					{ name: "@pid", value: projectId },
					{ name: "@type", value: type },
				],
			},
			projectId,
		);
	}

	/** Upsert a document (create or replace) */
	async upsert(item: UploadedDocument, _partitionKey: string): Promise<UploadedDocument> {
		const { resource } = await this.container.items.upsert(item);
		return resource as unknown as UploadedDocument;
	}
}
