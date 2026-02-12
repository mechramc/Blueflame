"use client";

interface BudgetWarningProps {
	currentSpend: number;
	ceiling: number;
	percentUsed: number;
}

export function BudgetWarning({ currentSpend, ceiling, percentUsed }: BudgetWarningProps) {
	if (percentUsed < 80) return null;

	const isCritical = percentUsed >= 95;

	return (
		<div
			className={`rounded border p-3 ${
				isCritical
					? "border-red-500/30 bg-red-500/10 text-red-400 animate-warning-pulse"
					: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
			}`}
			role="alert"
			data-testid="budget-warning"
		>
			<div className="flex items-center gap-2">
				<span className="text-base">{isCritical ? "\u26D4" : "\u26A0\uFE0F"}</span>
				<div>
					<p className="text-sm font-semibold">
						{isCritical ? "Budget Critical \u2014 Execution Paused" : "Budget Warning"}
					</p>
					<p className="text-xs mt-0.5 opacity-80">
						Spent ${currentSpend.toFixed(2)} of ${ceiling.toFixed(2)} ({percentUsed.toFixed(1)}%)
					</p>
				</div>
			</div>
		</div>
	);
}
