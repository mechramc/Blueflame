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
		<div className="flex items-center gap-3 p-3 bg-gray-50 rounded border">
			<label htmlFor="budget-input" className="text-sm font-medium text-gray-700">
				Budget Ceiling (USD):
			</label>
			<div className="flex items-center gap-1">
				<span className="text-gray-500">$</span>
				<input
					id="budget-input"
					type="number"
					min={0}
					step={0.01}
					value={value}
					onChange={handleChange}
					disabled={disabled}
					className="w-24 rounded border border-gray-300 px-2 py-1 text-sm font-mono disabled:opacity-50"
				/>
			</div>
			<button
				type="button"
				onClick={handleApply}
				disabled={disabled || value <= 0}
				className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
			>
				Set Budget
			</button>
			<span className="text-xs text-gray-500">
				Estimated: ${estimatedCost.toFixed(2)}
			</span>
		</div>
	);
}
