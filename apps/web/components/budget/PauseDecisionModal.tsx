"use client";

import { useState } from "react";

import { BudgetDecision } from "@blueflame/shared";

interface PauseDecisionModalProps {
	currentSpend: number;
	ceiling: number;
	onDecision: (decision: BudgetDecision, topUpAmount?: number) => void;
}

export function PauseDecisionModal({ currentSpend, ceiling, onDecision }: PauseDecisionModalProps) {
	const [topUp, setTopUp] = useState(Math.ceil(ceiling * 0.5 * 100) / 100);

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-freeze-overlay"
			data-testid="pause-decision-modal"
		>
			<div className="bg-[--bg-secondary] border border-[--border] rounded-lg shadow-xl p-6 max-w-md w-full mx-4 animate-modal-blast">
				<h2 className="text-lg font-semibold text-red-400 mb-2">Budget Limit Reached</h2>
				<p className="text-sm text-[--text-secondary] mb-4">
					Execution has been paused because spending reached the budget ceiling.
				</p>

				<div className="bg-[--bg-tertiary] rounded p-3 mb-4 text-sm space-y-1">
					<div className="flex justify-between">
						<span className="text-[--text-muted]">Current spend:</span>
						<span className="font-medium font-mono text-[--text-primary]">
							${currentSpend.toFixed(2)}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-[--text-muted]">Budget ceiling:</span>
						<span className="font-medium font-mono text-[--text-primary]">
							${ceiling.toFixed(2)}
						</span>
					</div>
				</div>

				<div className="space-y-3">
					{/* Resume option */}
					<div className="border border-[--border] rounded p-3">
						<p className="text-sm font-medium text-[--text-primary] mb-2">Resume with top-up</p>
						<div className="flex items-center gap-2 mb-2">
							<span className="text-sm text-[--text-muted]">$</span>
							<input
								type="number"
								min={0.01}
								step={0.01}
								value={topUp}
								onChange={(e) => {
									const num = Number.parseFloat(e.target.value);
									if (!Number.isNaN(num)) setTopUp(num);
								}}
								className="w-24 rounded border border-[--border] bg-[--bg-primary] px-2 py-1 text-sm font-mono text-[--text-primary]"
								data-testid="top-up-input"
							/>
						</div>
						<button
							type="button"
							onClick={() => onDecision(BudgetDecision.Resume, topUp)}
							disabled={topUp <= 0}
							className="w-full rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
							data-testid="resume-button"
						>
							Resume Execution
						</button>
					</div>

					{/* Accept partial */}
					<button
						type="button"
						onClick={() => onDecision(BudgetDecision.Accept)}
						className="w-full rounded border border-[--border-bright] px-3 py-2 text-sm text-[--text-secondary] hover:bg-[--bg-tertiary]"
						data-testid="accept-button"
					>
						Accept Partial Results
					</button>

					{/* Abandon */}
					<button
						type="button"
						onClick={() => onDecision(BudgetDecision.Abandon)}
						className="w-full rounded border border-red-500/30 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
						data-testid="abandon-button"
					>
						Abandon Run
					</button>
				</div>
			</div>
		</div>
	);
}
