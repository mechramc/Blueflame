/**
 * Audit Logger — stores and queries audit events for compliance dashboard.
 *
 * Stores entries in Cosmos DB "documents" container with type "audit-log".
 * Also keeps an in-memory buffer for fast querying during the session.
 */

import type { AuditEventType, AuditLogEntry, AuditOutcome } from "@blueflame/shared";
import { db } from "../db.js";

let auditCounter = 0;
const memoryBuffer: AuditLogEntry[] = [];

export interface LogAuditEventParams {
	eventType: AuditEventType;
	actor: string;
	action: string;
	resource: string;
	outcome: AuditOutcome;
	details: string;
	runId?: string;
	projectId?: string;
}

/**
 * Log an audit event to both memory and Cosmos DB.
 */
export async function logAuditEvent(params: LogAuditEventParams): Promise<AuditLogEntry> {
	auditCounter += 1;
	const entry: AuditLogEntry = {
		id: `audit-${Date.now()}-${auditCounter}`,
		timestamp: new Date().toISOString(),
		...params,
	};

	memoryBuffer.push(entry);

	// Persist to Cosmos (fire-and-forget)
	const projectId = params.projectId ?? "global";
	db.documents
		.create(
			{
				...entry,
				projectId,
				type: "audit-log",
			} as unknown as import("@blueflame/shared").UploadedDocument,
			projectId,
		)
		.catch((err) => {
			console.warn("[AuditLogger] Failed to persist:", err);
		});

	return entry;
}

export interface AuditQueryFilters {
	eventType?: string;
	outcome?: string;
	search?: string;
	dateFrom?: string;
	dateTo?: string;
}

/**
 * Query audit log entries with optional filters.
 */
export function queryAuditLog(filters?: AuditQueryFilters): {
	entries: AuditLogEntry[];
	total: number;
} {
	let entries = [...memoryBuffer];

	if (filters?.eventType) {
		entries = entries.filter((e) => e.eventType === filters.eventType);
	}
	if (filters?.outcome) {
		entries = entries.filter((e) => e.outcome === filters.outcome);
	}
	if (filters?.search) {
		const s = filters.search.toLowerCase();
		entries = entries.filter(
			(e) =>
				e.action.toLowerCase().includes(s) ||
				e.details.toLowerCase().includes(s) ||
				e.actor.toLowerCase().includes(s) ||
				e.resource.toLowerCase().includes(s),
		);
	}

	// Sort newest first
	entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

	return { entries, total: memoryBuffer.length };
}
