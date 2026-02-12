"use client";

import { useState } from "react";

interface BudgetInputProps {
	estimatedCost: number;
	onBudgetSet: (budget: number) => void;
	disabled?: boolean;
}

export function BudgetInput({ estimatedCost, onBudgetSet, disabled = false }: BudgetInputProps) {
	const [value, setValue] = useState(Math.ceil(estimatedCost * 1.2 * 100) / 100);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const num = Number.parseFloat(e.target.value);
		if (!Number.isNaN(num)) {
			setValue(num);
		}
	};

	const handleApply = () => {
		if (value > 0) {
			onBudgetSet(value);
		}
	};

	return (
		<div className="flex items-center gap-3 p-3 bg-[--bg-secondary] rounded border border-[--border]">
			<label htmlFor="budget-input" className="text-sm font-medium text-[--text-secondary]">
				Budget Ceiling (USD):
			</label>
			<div className="flex items-center gap-1">
				<span className="text-[--text-muted]">$</span>
				<input
					id="budget-input"
					type="number"
					min={0}
					step={0.01}
					value={value}
					onChange={handleChange}
					disabled={disabled}
					className="w-24 rounded border border-[--border] bg-[--bg-primary] px-2 py-1 text-sm font-mono text-[--text-primary] disabled:opacity-50"
				/>
			</div>
			<button
				type="button"
				onClick={handleApply}
				disabled={disabled || value <= 0}
				className="rounded border border-[--accent] px-3 py-1 text-sm text-blue-400 hover:bg-[--accent]/10 disabled:opacity-50"
			>
				Set Budget
			</button>
			<span className="text-xs text-[--text-muted] font-mono">
				Estimated: ${estimatedCost.toFixed(2)}
			</span>
		</div>
	);
}
