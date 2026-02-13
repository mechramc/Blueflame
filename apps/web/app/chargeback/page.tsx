"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import type { ChargebackEntry } from "@blueflame/shared";

/**
 * Chargeback Reporting Dashboard — cost breakdown by team, project, agent role, model tier.
 */

function BarChart({ items, max }: { items: Array<{ label: string; value: number }>; max: number }) {
	return (
		<div className="space-y-1">
			{items.map((item) => (
				<div key={item.label} className="flex items-center gap-2">
					<span className="text-[10px] text-[--text-secondary] w-24 truncate text-right">
						{item.label}
					</span>
					<div className="flex-1 h-3 bg-[--bg-tertiary] rounded-full overflow-hidden">
						<div
							className="h-full bg-[--accent] rounded-full transition-all duration-500"
							style={{ width: `${max > 0 ? (item.value / max) * 100 : 0}%` }}
						/>
					</div>
					<span className="text-[10px] font-mono text-[--text-muted] w-16 text-right">
						${item.value.toFixed(2)}
					</span>
				</div>
			))}
		</div>
	);
}

export default function ChargebackPage() {
	const [entries, setEntries] = useState<ChargebackEntry[]>([]);
	const [totals, setTotals] = useState({ spend: 0, tasks: 0 });
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchData() {
			setIsLoading(true);
			try {
				const data = await apiGet<{
					entries: ChargebackEntry[];
					totals: { spend: number; tasks: number };
				}>("/api/chargeback");
				setEntries(data.entries);
				setTotals(data.totals);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load chargeback data");
			} finally {
				setIsLoading(false);
			}
		}
		fetchData();
	}, []);

	return (
		<div className="max-w-7xl mx-auto p-6">
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-[--text-primary]">Chargeback Report</h1>
				<p className="text-sm text-[--text-secondary] mt-1">
					Cost breakdown by team, model, and agent role
				</p>
			</div>

			{error && (
				<div className="rounded border border-red-500/30 bg-red-500/10 p-3 mb-4">
					<p className="text-sm text-red-400">{error}</p>
				</div>
			)}

			{/* Summary cards */}
			<div className="grid grid-cols-3 gap-4 mb-6" data-testid="chargeback-summary">
				<div className="rounded border border-[--border] bg-[--bg-secondary] p-4">
					<div className="text-xs text-[--text-muted] mb-1">Total Spend</div>
					<div className="text-2xl font-bold font-mono text-emerald-400">
						${totals.spend.toFixed(2)}
					</div>
				</div>
				<div className="rounded border border-[--border] bg-[--bg-secondary] p-4">
					<div className="text-xs text-[--text-muted] mb-1">Total Tasks</div>
					<div className="text-2xl font-bold font-mono text-[--text-primary]">
						{totals.tasks.toLocaleString()}
					</div>
				</div>
				<div className="rounded border border-[--border] bg-[--bg-secondary] p-4">
					<div className="text-xs text-[--text-muted] mb-1">Cost Pools</div>
					<div className="text-2xl font-bold font-mono text-[--text-primary]">
						{entries.length}
					</div>
				</div>
			</div>

			{/* Empty state */}
			{!isLoading && entries.length === 0 && (
				<div className="rounded border border-[--border] bg-[--bg-secondary] p-12 text-center">
					<p className="text-sm text-[--text-secondary]">No cost data yet</p>
					<p className="text-xs text-[--text-muted] mt-1">
						Cost data will appear after running agents
					</p>
				</div>
			)}

			{/* Team cards */}
			<div className="grid gap-4" data-testid="chargeback-teams">
				{entries.map((entry) => {
					const maxModelCost = Math.max(0, ...entry.topModels.map((m) => m.cost));
					const maxRoleCost = Math.max(0, ...entry.topRoles.map((r) => r.cost));

					return (
						<div
							key={entry.poolId}
							className="rounded border border-[--border] bg-[--bg-primary] p-4"
						>
							<div className="flex items-center justify-between mb-4">
								<div>
									<h3 className="text-base font-semibold text-[--text-primary]">
										{entry.poolName}
									</h3>
									<span className="text-xs text-[--text-muted]">{entry.taskCount} tasks</span>
								</div>
								<div className="text-right">
									<div className="text-lg font-bold font-mono text-emerald-400">
										${entry.totalSpend.toFixed(2)}
									</div>
									{entry.taskCount > 0 && (
										<div className="text-[10px] text-[--text-muted]">
											${(entry.totalSpend / entry.taskCount).toFixed(3)}/task avg
										</div>
									)}
								</div>
							</div>

							<div className="grid grid-cols-2 gap-6">
								<div>
									<div className="text-xs font-medium text-[--text-secondary] mb-2">
										Cost by Model
									</div>
									<BarChart
										items={entry.topModels.map((m) => ({
											label: m.model,
											value: m.cost,
										}))}
										max={maxModelCost}
									/>
								</div>
								<div>
									<div className="text-xs font-medium text-[--text-secondary] mb-2">
										Cost by Role
									</div>
									<BarChart
										items={entry.topRoles.map((r) => ({
											label: r.role,
											value: r.cost,
										}))}
										max={maxRoleCost}
									/>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
