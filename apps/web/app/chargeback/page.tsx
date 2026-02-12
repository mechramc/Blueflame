"use client";

/**
 * Chargeback Reporting Dashboard — cost breakdown by team, project, agent role, model tier.
 *
 * Source: Blueflame-Spec-v3-ACAR.md Section 16 (Enterprise Budgeting)
 */

/** Chargeback entry from the API */
export interface ChargebackDisplayEntry {
	poolId: string;
	poolName: string;
	tier: "ORG" | "TEAM" | "PROJECT";
	totalSpend: number;
	taskCount: number;
	topModels: Array<{ model: string; cost: number }>;
	topRoles: Array<{ role: string; cost: number }>;
}

// Demo data
const DEMO_ENTRIES: ChargebackDisplayEntry[] = [
	{
		poolId: "pool-team-1",
		poolName: "Frontend Team",
		tier: "TEAM",
		totalSpend: 245.5,
		taskCount: 156,
		topModels: [
			{ model: "gpt-4o", cost: 150.0 },
			{ model: "gpt-4o-mini", cost: 65.5 },
			{ model: "claude-sonnet-4-5", cost: 30.0 },
		],
		topRoles: [
			{ role: "Builder", cost: 180.0 },
			{ role: "Verifier", cost: 45.5 },
			{ role: "Explainer", cost: 20.0 },
		],
	},
	{
		poolId: "pool-team-2",
		poolName: "Backend Team",
		tier: "TEAM",
		totalSpend: 412.75,
		taskCount: 287,
		topModels: [
			{ model: "gpt-4o", cost: 280.0 },
			{ model: "claude-sonnet-4-5", cost: 82.75 },
			{ model: "gpt-4o-mini", cost: 50.0 },
		],
		topRoles: [
			{ role: "Builder", cost: 300.0 },
			{ role: "Verifier", cost: 72.75 },
			{ role: "Fixer", cost: 40.0 },
		],
	},
	{
		poolId: "pool-team-3",
		poolName: "Platform Team",
		tier: "TEAM",
		totalSpend: 89.0,
		taskCount: 45,
		topModels: [
			{ model: "gpt-4o-mini", cost: 60.0 },
			{ model: "gpt-4o", cost: 29.0 },
		],
		topRoles: [
			{ role: "Builder", cost: 55.0 },
			{ role: "Verifier", cost: 34.0 },
		],
	},
];

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
	const totalSpend = DEMO_ENTRIES.reduce((sum, e) => sum + e.totalSpend, 0);
	const totalTasks = DEMO_ENTRIES.reduce((sum, e) => sum + e.taskCount, 0);

	return (
		<div className="max-w-7xl mx-auto p-6">
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-[--text-primary]">Chargeback Report</h1>
				<p className="text-sm text-[--text-secondary] mt-1">
					Cost breakdown by team, model, and agent role
				</p>
			</div>

			{/* Summary cards */}
			<div className="grid grid-cols-3 gap-4 mb-6" data-testid="chargeback-summary">
				<div className="rounded border border-[--border] bg-[--bg-secondary] p-4">
					<div className="text-xs text-[--text-muted] mb-1">Total Spend</div>
					<div className="text-2xl font-bold font-mono text-emerald-400">
						${totalSpend.toFixed(2)}
					</div>
				</div>
				<div className="rounded border border-[--border] bg-[--bg-secondary] p-4">
					<div className="text-xs text-[--text-muted] mb-1">Total Tasks</div>
					<div className="text-2xl font-bold font-mono text-[--text-primary]">
						{totalTasks.toLocaleString()}
					</div>
				</div>
				<div className="rounded border border-[--border] bg-[--bg-secondary] p-4">
					<div className="text-xs text-[--text-muted] mb-1">Teams</div>
					<div className="text-2xl font-bold font-mono text-[--text-primary]">
						{DEMO_ENTRIES.length}
					</div>
				</div>
			</div>

			{/* Team cards */}
			<div className="grid gap-4" data-testid="chargeback-teams">
				{DEMO_ENTRIES.map((entry) => {
					const maxModelCost = Math.max(...entry.topModels.map((m) => m.cost));
					const maxRoleCost = Math.max(...entry.topRoles.map((r) => r.cost));

					return (
						<div
							key={entry.poolId}
							className="rounded border border-[--border] bg-[--bg-primary] p-4"
							data-testid={`team-${entry.poolId}`}
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
									<div className="text-[10px] text-[--text-muted]">
										${(entry.totalSpend / entry.taskCount).toFixed(3)}/task avg
									</div>
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
