"use client";

import { useState } from "react";

import { BudgetDecision } from "@blueflame/shared";

interface PauseDecisionModalProps {
	currentSpend: number;
	ceiling: number;
	onDecision: (decision: BudgetDecision, topUpAmount?: number) => void;
}

/**
 * Modal shown when budget reaches 95%. Offers 3 options:
 * - Resume: top up budget and continue
 * - Accept Partial: keep partial results, stop execution
 * - Abandon: discard and stop
 */
export function PauseDecisionModal({ currentSpend, ceiling, onDecision }: PauseDecisionModalProps) {
	const [topUp, setTopUp] = useState(Math.ceil(ceiling * 0.5 * 100) / 100);

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			data-testid="pause-decision-modal"
		>
			<div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
				<h2 className="text-lg font-semibold text-red-700 mb-2">Budget Limit Reached</h2>
				<p className="text-sm text-gray-600 mb-4">
					Execution has been paused because spending reached the budget ceiling.
				</p>

				<div className="bg-gray-50 rounded p-3 mb-4 text-sm space-y-1">
					<div className="flex justify-between">
						<span className="text-gray-500">Current spend:</span>
						<span className="font-medium font-mono">${currentSpend.toFixed(2)}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-gray-500">Budget ceiling:</span>
						<span className="font-medium font-mono">${ceiling.toFixed(2)}</span>
					</div>
				</div>

				<div className="space-y-3">
					{/* Resume option */}
					<div className="border rounded p-3">
						<p className="text-sm font-medium text-gray-900 mb-2">Resume with top-up</p>
						<div className="flex items-center gap-2 mb-2">
							<span className="text-sm text-gray-500">$</span>
							<input
								type="number"
								min={0.01}
								step={0.01}
								value={topUp}
								onChange={(e) => {
									const num = Number.parseFloat(e.target.value);
									if (!Number.isNaN(num)) setTopUp(num);
								}}
								className="w-24 rounded border border-gray-300 px-2 py-1 text-sm font-mono"
								data-testid="top-up-input"
							/>
						</div>
						<button
							type="button"
							onClick={() => onDecision(BudgetDecision.Resume, topUp)}
							disabled={topUp <= 0}
							className="w-full rounded bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
							data-testid="resume-button"
						>
							Resume Execution
						</button>
					</div>

					{/* Accept partial */}
					<button
						type="button"
						onClick={() => onDecision(BudgetDecision.Accept)}
						className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
						data-testid="accept-button"
					>
						Accept Partial Results
					</button>

					{/* Abandon */}
					<button
						type="button"
						onClick={() => onDecision(BudgetDecision.Abandon)}
						className="w-full rounded border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
						data-testid="abandon-button"
					>
						Abandon Run
					</button>
				</div>
			</div>
		</div>
	);
}
