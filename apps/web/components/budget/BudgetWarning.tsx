"use client";

interface BudgetWarningProps {
	currentSpend: number;
	ceiling: number;
	percentUsed: number;
}

/**
 * Warning alert overlay shown at 80%+ budget usage.
 */
export function BudgetWarning({ currentSpend, ceiling, percentUsed }: BudgetWarningProps) {
	if (percentUsed < 80) return null;

	const isCritical = percentUsed >= 95;

	return (
		<div
			className={`rounded-lg border p-3 ${
				isCritical
					? "border-red-300 bg-red-50 text-red-800"
					: "border-yellow-300 bg-yellow-50 text-yellow-800"
			}`}
			role="alert"
			data-testid="budget-warning"
		>
			<div className="flex items-center gap-2">
				<span className="text-lg">{isCritical ? "\u26D4" : "\u26A0\uFE0F"}</span>
				<div>
					<p className="text-sm font-semibold">
						{isCritical ? "Budget Critical — Execution Paused" : "Budget Warning"}
					</p>
					<p className="text-xs mt-0.5">
						Spent ${currentSpend.toFixed(2)} of ${ceiling.toFixed(2)} ({percentUsed.toFixed(1)}%)
					</p>
				</div>
			</div>
		</div>
	);
}
