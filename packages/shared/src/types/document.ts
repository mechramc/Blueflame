/**
 * UploadedDocument (document metadata with blob reference).
 * Source: Blueflame-Spec-v3-ACAR.md Section 13.2 (documents container)
 */

import type { DocumentType } from "./enums.js";

/** An uploaded document's metadata (Cosmos DB: documents container) */
export interface UploadedDocument {
	/** Cosmos DB document ID */
	id: string;
	/** Unique document identifier */
	documentId: string;
	/** Partition key */
	projectId: string;
	/** Original filename */
	filename: string;
	/** Azure Blob Storage URI */
	blobUri: string;
	/** Document category */
	type: DocumentType;
	/** Whether the document has been indexed for search */
	indexed: boolean;
	/** ISO 8601 upload timestamp */
	uploadedAt: string;
	/** User ID of uploader */
	uploadedBy: string;
}
