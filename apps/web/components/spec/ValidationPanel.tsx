"use client";

import { apiPost } from "@/lib/api-client";
import type { SpecStatus } from "@blueflame/shared";
import { useCallback, useEffect, useState } from "react";
import { WorkflowProgressBar } from "./WorkflowProgressBar";

interface ValidationPanelProps {
	specId: string | null;
	specContent: string;
	status: SpecStatus;
}

interface SchemaCheck {
	valid: boolean;
	errors: string[];
}

interface PolicyViolation {
	rule: string;
	message: string;
	severity: "error" | "warning";
}

interface PolicyCheck {
	valid: boolean;
	violations: PolicyViolation[];
}

interface BudgetEstimate {
	estimatedCost: number;
	taskCount: number;
	modelTier: string;
}

interface ValidationResult {
	schema: SchemaCheck;
	policy: PolicyCheck;
	budget: BudgetEstimate;
}

function CheckIcon({ pass }: { pass: boolean }) {
	return (
		<span className={`text-xs ${pass ? "text-emerald-400" : "text-red-400"}`}>
			{pass ? "✓" : "✗"}
		</span>
	);
}

export function ValidationPanel({ specId, specContent, status }: ValidationPanelProps) {
	const [validation, setValidation] = useState<ValidationResult | null>(null);
	const [isValidating, setIsValidating] = useState(false);

	const runValidation = useCallback(async () => {
		if (!specId || !specContent.trim()) return;

		setIsValidating(true);
		try {
			const result = await apiPost<ValidationResult>(`/api/specs/${specId}/validate`, {
				content: specContent,
			});
			setValidation(result);
		} catch {
			// API unavailable — clear validation
			setValidation(null);
		} finally {
			setIsValidating(false);
		}
	}, [specId, specContent]);

	// Auto-validate on content change (debounced)
	// biome-ignore lint/correctness/useExhaustiveDependencies: specContent triggers runValidation refresh via useCallback
	useEffect(() => {
		if (!specId) return;

		const timer = setTimeout(() => {
			runValidation();
		}, 800);

		return () => clearTimeout(timer);
	}, [specId, specContent, runValidation]);

	return (
		<div className="flex h-full flex-col bg-[--bg-primary]">
			{/* Header */}
			<div className="border-b border-[--border] px-3 py-3">
				<h3 className="text-sm font-semibold text-[--text-primary]">Validation</h3>
			</div>

			{/* Workflow Progress */}
			<div className="border-b border-[--border]">
				<WorkflowProgressBar status={status} />
			</div>

			<div className="flex-1 overflow-y-auto p-3 space-y-4">
				{/* Loading state */}
				{isValidating && <div className="text-xs text-[--accent] animate-pulse">Validating...</div>}

				{/* No spec yet */}
				{!specId && (
					<div className="text-xs text-[--text-muted] text-center py-8">
						Generate a spec to see validation results
					</div>
				)}

				{/* Schema Check */}
				{validation && (
					<div>
						<div className="flex items-center gap-2 mb-2">
							<CheckIcon pass={validation.schema.valid} />
							<span className="text-xs font-medium text-[--text-primary]">Schema Check</span>
						</div>
						{validation.schema.valid ? (
							<p className="text-[10px] text-emerald-400/80 ml-5">YAML structure valid</p>
						) : (
							<ul className="ml-5 space-y-1">
								{validation.schema.errors.map((err) => (
									<li key={err} className="text-[10px] text-red-400">
										{err}
									</li>
								))}
							</ul>
						)}
					</div>
				)}

				{/* Policy Check */}
				{validation && (
					<div>
						<div className="flex items-center gap-2 mb-2">
							<CheckIcon pass={validation.policy.valid} />
							<span className="text-xs font-medium text-[--text-primary]">Policy Check</span>
						</div>
						{validation.policy.violations.length === 0 ? (
							<p className="text-[10px] text-emerald-400/80 ml-5">All policies satisfied</p>
						) : (
							<ul className="ml-5 space-y-1">
								{validation.policy.violations.map((v) => (
									<li
										key={`${v.rule}-${v.message}`}
										className={`text-[10px] ${
											v.severity === "error" ? "text-red-400" : "text-amber-400"
										}`}
									>
										<span className="font-mono">[{v.rule}]</span> {v.message}
									</li>
								))}
							</ul>
						)}
					</div>
				)}

				{/* Budget Estimate */}
				{validation && validation.budget.taskCount > 0 && (
					<div>
						<div className="flex items-center gap-2 mb-2">
							<span className="text-xs text-[--accent]">$</span>
							<span className="text-xs font-medium text-[--text-primary]">Budget Estimate</span>
						</div>
						<div className="ml-5 space-y-1">
							<div className="flex justify-between text-[10px]">
								<span className="text-[--text-muted]">Estimated tasks</span>
								<span className="text-[--text-primary] font-mono">
									{validation.budget.taskCount}
								</span>
							</div>
							<div className="flex justify-between text-[10px]">
								<span className="text-[--text-muted]">Estimated cost</span>
								<span className="text-emerald-400 font-mono">
									${validation.budget.estimatedCost.toFixed(2)}
								</span>
							</div>
							<div className="flex justify-between text-[10px]">
								<span className="text-[--text-muted]">Model tier</span>
								<span className="text-[--text-secondary]">{validation.budget.modelTier}</span>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
