"use client";

interface CostProgressBarProps {
	currentSpend: number;
	ceiling: number;
}

/**
 * Progress bar showing current spend vs. budget ceiling.
 * Color transitions: green (<80%) → yellow (80-95%) → red (>=95%).
 * Animated burn gradient at 90%+.
 */
export function CostProgressBar({ currentSpend, ceiling }: CostProgressBarProps) {
	const percent = ceiling > 0 ? Math.min((currentSpend / ceiling) * 100, 100) : 0;
	const isBurning = percent >= 90;

	const barColor = isBurning
		? "bg-burn-gradient bg-200% animate-burn-progress"
		: percent >= 80
			? "bg-yellow-500"
			: "bg-green-500";

	const textColor =
		percent >= 95 ? "text-red-600" : percent >= 80 ? "text-yellow-600" : "text-green-600";

	return (
		<div className="w-full" data-testid="cost-progress-bar">
			<div className="flex justify-between text-xs mb-1">
				<span className={`font-medium ${textColor}`}>
					${currentSpend.toFixed(2)} / ${ceiling.toFixed(2)}
				</span>
				<span className={`font-mono ${textColor}`}>{percent.toFixed(1)}%</span>
			</div>
			<div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
				<div
					className={`h-full rounded-full transition-all duration-300 ${barColor}`}
					style={{ width: `${percent}%` }}
					role="progressbar"
					tabIndex={0}
					aria-valuenow={percent}
					aria-valuemin={0}
					aria-valuemax={100}
				/>
			</div>
		</div>
	);
}
