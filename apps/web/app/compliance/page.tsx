"use client";

import { apiGet } from "@/lib/api-client";
import type { AuditLogEntry } from "@blueflame/shared";
import { useCallback, useEffect, useState } from "react";

/**
 * Compliance Dashboard — audit log viewer with filters and CSV export.
 */

interface AuditFilters {
	eventType: string;
	outcome: string;
	search: string;
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
	});
	const [entries, setEntries] = useState<AuditLogEntry[]>([]);
	const [total, setTotal] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchEntries = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const params = new URLSearchParams();
			if (filters.eventType) params.set("eventType", filters.eventType);
			if (filters.outcome) params.set("outcome", filters.outcome);
			if (filters.search) params.set("search", filters.search);

			const qs = params.toString();
			const data = await apiGet<{ entries: AuditLogEntry[]; total: number }>(
				`/api/compliance/audit-log${qs ? `?${qs}` : ""}`,
			);
			setEntries(data.entries);
			setTotal(data.total);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load audit log");
		} finally {
			setIsLoading(false);
		}
	}, [filters]);

	useEffect(() => {
		fetchEntries();
	}, [fetchEntries]);

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
					onClick={() => exportCsv(entries)}
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

			{/* Status */}
			{error && (
				<div className="rounded border border-red-500/30 bg-red-500/10 p-3 mb-4">
					<p className="text-sm text-red-400">{error}</p>
				</div>
			)}

			<div className="text-xs text-[--text-muted] mb-2">
				{isLoading ? "Loading..." : `${entries.length} of ${total} entries`}
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
						{entries.length === 0 && !isLoading && (
							<tr>
								<td colSpan={7} className="px-4 py-8 text-center text-sm text-[--text-muted]">
									No audit entries yet. Events will appear as you interact with the system.
								</td>
							</tr>
						)}
						{entries.map((entry) => (
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
