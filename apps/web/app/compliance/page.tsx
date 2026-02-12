"use client";

import { useState } from "react";

/**
 * Compliance Dashboard — audit log viewer with filters and CSV export.
 *
 * Displays authorization events, agent actions, and governance decisions
 * in a filterable, searchable table with CSV export capability.
 *
 * Source: Blueflame-Spec-v3-ACAR.md Section 13 (Enterprise Governance)
 */

/** Audit log entry */
export interface AuditLogEntry {
	id: string;
	timestamp: string;
	eventType: "AUTH" | "AGENT" | "BUDGET" | "GOVERNANCE" | "ROUTING";
	actor: string;
	action: string;
	resource: string;
	outcome: "ALLOWED" | "DENIED" | "WARNING";
	details: string;
	runId?: string;
	projectId?: string;
}

/** Filter state */
interface AuditFilters {
	eventType: string;
	outcome: string;
	search: string;
	dateFrom: string;
	dateTo: string;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
	AUTH: "bg-blue-500/20 text-blue-400",
	AGENT: "bg-purple-500/20 text-purple-400",
	BUDGET: "bg-amber-500/20 text-amber-400",
	GOVERNANCE: "bg-teal-500/20 text-teal-400",
	ROUTING: "bg-emerald-500/20 text-emerald-400",
};

const OUTCOME_COLORS: Record<string, string> = {
	ALLOWED: "text-emerald-400",
	DENIED: "text-red-400",
	WARNING: "text-amber-400",
};

// Demo audit log data
const DEMO_ENTRIES: AuditLogEntry[] = [
	{
		id: "audit-001",
		timestamp: "2026-02-12T10:00:00Z",
		eventType: "AUTH",
		actor: "admin@contoso.com",
		action: "plan.authorize",
		resource: "LOCK-001",
		outcome: "ALLOWED",
		details: "Plan authorized with $50 budget ceiling",
		runId: "run-001",
		projectId: "proj-001",
	},
	{
		id: "audit-002",
		timestamp: "2026-02-12T10:01:00Z",
		eventType: "ROUTING",
		actor: "system",
		action: "sigma.route",
		resource: "TASK-001",
		outcome: "ALLOWED",
		details: "\u03C3=0.15 \u2192 Routine tier \u2192 gpt-4o-mini (Azure)",
		runId: "run-001",
	},
	{
		id: "audit-003",
		timestamp: "2026-02-12T10:02:00Z",
		eventType: "AGENT",
		actor: "Builder",
		action: "code.generate",
		resource: "TASK-001",
		outcome: "ALLOWED",
		details: "Generated 3 files, 245 lines",
		runId: "run-001",
	},
	{
		id: "audit-004",
		timestamp: "2026-02-12T10:05:00Z",
		eventType: "BUDGET",
		actor: "system",
		action: "budget.warning",
		resource: "run-001",
		outcome: "WARNING",
		details: "Budget at 82% ($41 of $50)",
		runId: "run-001",
	},
	{
		id: "audit-005",
		timestamp: "2026-02-12T10:10:00Z",
		eventType: "GOVERNANCE",
		actor: "system",
		action: "constraint.check",
		resource: "LOCK-001",
		outcome: "DENIED",
		details: "SECRET_SCANNING: API key detected in generated code",
		runId: "run-001",
	},
];

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString();
}

function exportCsv(entries: AuditLogEntry[]): void {
	const headers = [
		"Timestamp",
		"Event Type",
		"Actor",
		"Action",
		"Resource",
		"Outcome",
		"Details",
		"Run ID",
	];
	const rows = entries.map((e) => [
		e.timestamp,
		e.eventType,
		e.actor,
		e.action,
		e.resource,
		e.outcome,
		`"${e.details.replace(/"/g, '""')}"`,
		e.runId ?? "",
	]);

	const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
	const blob = new Blob([csv], { type: "text/csv" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
	a.click();
	URL.revokeObjectURL(url);
}

export default function CompliancePage() {
	const [filters, setFilters] = useState<AuditFilters>({
		eventType: "",
		outcome: "",
		search: "",
		dateFrom: "",
		dateTo: "",
	});

	const filtered = DEMO_ENTRIES.filter((entry) => {
		if (filters.eventType && entry.eventType !== filters.eventType) return false;
		if (filters.outcome && entry.outcome !== filters.outcome) return false;
		if (filters.search) {
			const s = filters.search.toLowerCase();
			const match =
				entry.action.toLowerCase().includes(s) ||
				entry.details.toLowerCase().includes(s) ||
				entry.actor.toLowerCase().includes(s) ||
				entry.resource.toLowerCase().includes(s);
			if (!match) return false;
		}
		return true;
	});

	return (
		<div className="max-w-7xl mx-auto p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-[--text-primary]">Compliance Dashboard</h1>
					<p className="text-sm text-[--text-secondary] mt-1">
						Audit log viewer — authorization events, agent actions, governance decisions
					</p>
				</div>
				<button
					type="button"
					onClick={() => exportCsv(filtered)}
					className="px-4 py-2 text-sm font-medium bg-[--accent] text-white rounded hover:opacity-90 transition-opacity"
				>
					Export CSV
				</button>
			</div>

			{/* Filters */}
			<div className="flex gap-3 mb-4 flex-wrap" data-testid="compliance-filters">
				<select
					value={filters.eventType}
					onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
					className="bg-[--bg-secondary] border border-[--border] text-[--text-primary] text-sm rounded px-3 py-1.5"
				>
					<option value="">All Events</option>
					<option value="AUTH">Auth</option>
					<option value="AGENT">Agent</option>
					<option value="BUDGET">Budget</option>
					<option value="GOVERNANCE">Governance</option>
					<option value="ROUTING">Routing</option>
				</select>

				<select
					value={filters.outcome}
					onChange={(e) => setFilters({ ...filters, outcome: e.target.value })}
					className="bg-[--bg-secondary] border border-[--border] text-[--text-primary] text-sm rounded px-3 py-1.5"
				>
					<option value="">All Outcomes</option>
					<option value="ALLOWED">Allowed</option>
					<option value="DENIED">Denied</option>
					<option value="WARNING">Warning</option>
				</select>

				<input
					type="text"
					placeholder="Search..."
					value={filters.search}
					onChange={(e) => setFilters({ ...filters, search: e.target.value })}
					className="bg-[--bg-secondary] border border-[--border] text-[--text-primary] text-sm rounded px-3 py-1.5 w-64"
				/>
			</div>

			{/* Results count */}
			<div className="text-xs text-[--text-muted] mb-2">
				{filtered.length} of {DEMO_ENTRIES.length} entries
			</div>

			{/* Table */}
			<div className="rounded border border-[--border] overflow-hidden">
				<table className="w-full text-sm" data-testid="compliance-table">
					<thead>
						<tr className="bg-[--bg-secondary] text-[--text-secondary] text-left">
							<th className="px-4 py-2 font-medium">Timestamp</th>
							<th className="px-4 py-2 font-medium">Type</th>
							<th className="px-4 py-2 font-medium">Actor</th>
							<th className="px-4 py-2 font-medium">Action</th>
							<th className="px-4 py-2 font-medium">Resource</th>
							<th className="px-4 py-2 font-medium">Outcome</th>
							<th className="px-4 py-2 font-medium">Details</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((entry) => (
							<tr
								key={entry.id}
								className="border-t border-[--border] hover:bg-[--bg-secondary]/50 transition-colors"
							>
								<td className="px-4 py-2 font-mono text-xs text-[--text-secondary]">
									{formatDate(entry.timestamp)}
								</td>
								<td className="px-4 py-2">
									<span
										className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${EVENT_TYPE_COLORS[entry.eventType] ?? ""}`}
									>
										{entry.eventType}
									</span>
								</td>
								<td className="px-4 py-2 text-[--text-primary]">{entry.actor}</td>
								<td className="px-4 py-2 font-mono text-xs text-[--text-secondary]">
									{entry.action}
								</td>
								<td className="px-4 py-2 font-mono text-xs text-[--text-secondary]">
									{entry.resource}
								</td>
								<td className="px-4 py-2">
									<span className={`text-xs font-semibold ${OUTCOME_COLORS[entry.outcome] ?? ""}`}>
										{entry.outcome}
									</span>
								</td>
								<td className="px-4 py-2 text-xs text-[--text-secondary] max-w-xs truncate">
									{entry.details}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
