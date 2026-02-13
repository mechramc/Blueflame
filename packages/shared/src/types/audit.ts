/**
 * AuditLogEntry — audit trail for compliance dashboard.
 */

export type AuditEventType = "AUTH" | "AGENT" | "BUDGET" | "GOVERNANCE" | "ROUTING";
export type AuditOutcome = "ALLOWED" | "DENIED" | "WARNING";

export interface AuditLogEntry {
	id: string;
	timestamp: string;
	eventType: AuditEventType;
	actor: string;
	action: string;
	resource: string;
	outcome: AuditOutcome;
	details: string;
	runId?: string;
	projectId?: string;
}
