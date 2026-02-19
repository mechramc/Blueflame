"use client";

import { CostProgressBar } from "@/components/budget/CostProgressBar";
import { DAGProgress } from "@/components/dashboard/DAGProgress";
import { apiDelete, apiGet, apiPost } from "@/lib/api-client";
import { ConstraintEnforcement, ConstraintType } from "@blueflame/shared";
import type { Constraint, PlanTask, SpecStatus, TaskPlan } from "@blueflame/shared";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RunHistory } from "./RunHistory";
import { WorkflowProgressBar } from "./WorkflowProgressBar";

interface ValidationPanelProps {
	specId: string | null;
	specContent: string;
	status: SpecStatus;
	projectId: string;
	runId: string | null;
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

function sigmaColor(sigma: number): string {
	if (sigma < 0.3) return "text-emerald-400";
	if (sigma <= 0.7) return "text-blue-400";
	return "text-purple-400";
}

function sigmaLabel(sigma: number): string {
	if (sigma < 0.3) return "routine";
	if (sigma <= 0.7) return "standard";
	return "complex";
}

export function ValidationPanel({
	specId,
	specContent,
	status,
	projectId,
	runId,
}: ValidationPanelProps) {
	const [validation, setValidation] = useState<ValidationResult | null>(null);
	const [isValidating, setIsValidating] = useState(false);
	const [plan, setPlan] = useState<TaskPlan | null>(null);
	const [planLoading, setPlanLoading] = useState(false);
	const [actualSpend, setActualSpend] = useState<number | null>(null);
	const [constraints, setConstraints] = useState<Constraint[]>([]);
	const [showAddConstraint, setShowAddConstraint] = useState(false);
	const [newRule, setNewRule] = useState("");
	const [newType, setNewType] = useState<ConstraintType>(ConstraintType.Architectural);
	const [newEnforcement, setNewEnforcement] = useState<ConstraintEnforcement>(
		ConstraintEnforcement.Hard,
	);

	// Load constraints
	useEffect(() => {
		async function loadConstraints() {
			try {
				const data = await apiGet<{ constraints: Constraint[] }>(
					`/api/projects/${projectId}/constraints`,
				);
				setConstraints(data.constraints);
			} catch {
				// API unavailable
			}
		}
		loadConstraints();
	}, [projectId]);

	const handleAddConstraint = async () => {
		if (!newRule.trim()) return;
		try {
			const data = await apiPost<{ constraint: Constraint }>(
				`/api/projects/${projectId}/constraints`,
				{
					rule: newRule.trim(),
					type: newType,
					enforcement: newEnforcement,
				},
			);
			setConstraints((prev) => [...prev, data.constraint]);
			setNewRule("");
			setShowAddConstraint(false);
		} catch {
			// API error
		}
	};

	const handleDeleteConstraint = async (constraintId: string) => {
		try {
			await apiDelete(`/api/projects/${projectId}/constraints/${constraintId}`);
			setConstraints((prev) => prev.filter((c) => c.constraintId !== constraintId));
		} catch {
			// API error
		}
	};

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

	// Fetch plan when runId changes
	useEffect(() => {
		if (!runId) {
			setPlan(null);
			return;
		}

		let cancelled = false;
		setPlanLoading(true);

		async function fetchPlan() {
			try {
				const data = await apiGet<{ plan: TaskPlan }>(`/api/plans/${runId}`);
				if (!cancelled) {
					setPlan(data.plan);
				}
			} catch {
				if (!cancelled) {
					setPlan(null);
				}
			} finally {
				if (!cancelled) {
					setPlanLoading(false);
				}
			}
		}
		fetchPlan();

		return () => {
			cancelled = true;
		};
	}, [runId]);

	// Fetch actual spend when runId changes
	useEffect(() => {
		if (!runId) {
			setActualSpend(null);
			return;
		}

		let cancelled = false;
		async function fetchBudget() {
			try {
				const data = await apiGet<{ currentSpend: number }>(`/api/budget/${runId}`);
				if (!cancelled) {
					setActualSpend(data.currentSpend);
				}
			} catch {
				if (!cancelled) {
					setActualSpend(null);
				}
			}
		}
		fetchBudget();

		return () => {
			cancelled = true;
		};
	}, [runId]);

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

				{/* Constraint Registry */}
				<div>
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-2">
							<span className="text-xs text-amber-400">&#9881;</span>
							<span className="text-xs font-medium text-[--text-primary]">Constraint Registry</span>
							<span className="text-[9px] px-1 py-0.5 rounded bg-[--bg-tertiary] text-[--text-muted]">
								{constraints.length}
							</span>
						</div>
						<button
							type="button"
							onClick={() => setShowAddConstraint(!showAddConstraint)}
							className="text-[10px] text-[--accent] hover:underline"
						>
							{showAddConstraint ? "Cancel" : "+ Add"}
						</button>
					</div>

					{showAddConstraint && (
						<div className="ml-5 mb-2 space-y-1.5 p-2 rounded border border-[--border] bg-[--bg-secondary]">
							<input
								type="text"
								value={newRule}
								onChange={(e) => setNewRule(e.target.value)}
								placeholder="e.g. All endpoints must validate input with Zod"
								className="w-full text-[10px] rounded border border-[--border] bg-[--bg-primary] px-2 py-1 text-[--text-primary] placeholder-[--text-muted]"
								data-testid="constraint-rule-input"
							/>
							<div className="flex gap-2">
								<select
									value={newType}
									onChange={(e) => setNewType(e.target.value as ConstraintType)}
									className="text-[10px] rounded border border-[--border] bg-[--bg-primary] px-1 py-0.5 text-[--text-secondary]"
								>
									{Object.values(ConstraintType).map((t) => (
										<option key={t} value={t}>
											{t}
										</option>
									))}
								</select>
								<select
									value={newEnforcement}
									onChange={(e) => setNewEnforcement(e.target.value as ConstraintEnforcement)}
									className="text-[10px] rounded border border-[--border] bg-[--bg-primary] px-1 py-0.5 text-[--text-secondary]"
								>
									{Object.values(ConstraintEnforcement).map((e) => (
										<option key={e} value={e}>
											{e}
										</option>
									))}
								</select>
								<button
									type="button"
									onClick={handleAddConstraint}
									disabled={!newRule.trim()}
									className="text-[10px] rounded bg-[--accent] px-2 py-0.5 text-white disabled:opacity-50"
								>
									Add
								</button>
							</div>
						</div>
					)}

					{constraints.length === 0 ? (
						<p className="text-[10px] text-[--text-muted] ml-5">No constraints defined</p>
					) : (
						<div className="ml-5 space-y-1">
							{constraints.map((c) => (
								<div
									key={c.constraintId}
									className="flex items-start gap-2 text-[10px] p-1.5 rounded border border-[--border] bg-[--bg-secondary]"
								>
									<div className="flex-1 min-w-0">
										<p className="text-[--text-primary]">{c.rule}</p>
										<div className="flex gap-1.5 mt-0.5">
											<span className="px-1 py-0.5 rounded bg-[--bg-tertiary] text-[--text-muted]">
												{c.type}
											</span>
											<span
												className={`px-1 py-0.5 rounded ${c.enforcement === "hard" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}
											>
												{c.enforcement}
											</span>
										</div>
									</div>
									<button
										type="button"
										onClick={() => handleDeleteConstraint(c.constraintId)}
										className="text-[--text-muted] hover:text-red-400 shrink-0"
										aria-label="Delete constraint"
									>
										&times;
									</button>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Cost Governance */}
				{plan && plan.tasks.length > 0 && (
					<div>
						<div className="flex items-center gap-2 mb-2">
							<span className="text-xs text-[--accent]">$</span>
							<span className="text-xs font-medium text-[--text-primary]">Cost Governance</span>
						</div>
						<div className="ml-5 space-y-1.5">
							<div className="flex justify-between text-[10px]">
								<span className="text-[--text-muted]">Pre-run estimate</span>
								<span className="text-emerald-400 font-mono">
									${plan.totalEstimatedCost.toFixed(2)}
								</span>
							</div>
							<div className="flex justify-between text-[10px]">
								<span className="text-[--text-muted]">Budget ceiling</span>
								<span className="text-[--text-primary] font-mono">
									${Math.max(plan.totalEstimatedCost * 3, 5.0).toFixed(2)}
								</span>
							</div>
							{runId && actualSpend !== null && (
								<div className="pt-1">
									<CostProgressBar
										currentSpend={actualSpend}
										ceiling={Math.max(plan.totalEstimatedCost * 3, 5.0)}
									/>
								</div>
							)}
							<div className="flex gap-3 pt-1">
								<Link href="/compliance" className="text-[10px] text-[--accent] hover:underline">
									View Audit Trail &rarr;
								</Link>
								<Link href="/chargeback" className="text-[10px] text-[--accent] hover:underline">
									View Cost Breakdown &rarr;
								</Link>
							</div>
						</div>
					</div>
				)}

				{/* Plan Preview */}
				{planLoading && (
					<div className="text-xs text-[--accent] animate-pulse">Loading plan...</div>
				)}
				{plan && plan.tasks.length > 0 && (
					<div>
						<div className="flex items-center gap-2 mb-2">
							<span className="text-xs text-purple-400">&#9670;</span>
							<span className="text-xs font-medium text-[--text-primary]">Plan Preview</span>
						</div>

						{/* Summary */}
						<div className="ml-5 mb-3 space-y-1">
							<div className="flex justify-between text-[10px]">
								<span className="text-[--text-muted]">Tasks</span>
								<span className="text-[--text-primary] font-mono">{plan.tasks.length}</span>
							</div>
							<div className="flex justify-between text-[10px]">
								<span className="text-[--text-muted]">Estimated cost</span>
								<span className="text-emerald-400 font-mono">
									${plan.totalEstimatedCost.toFixed(2)}
								</span>
							</div>
							<div className="flex justify-between text-[10px]">
								<span className="text-[--text-muted]">Estimated tokens</span>
								<span className="text-[--text-secondary] font-mono">
									{plan.totalEstimatedTokens.toLocaleString()}
								</span>
							</div>
						</div>

						{/* Mini DAG */}
						<div className="mb-3">
							<DAGProgress tasks={plan.tasks} />
						</div>

						{/* Task list */}
						<div className="space-y-1.5">
							{plan.tasks.map((task: PlanTask) => (
								<div
									key={task.id}
									className="rounded border border-[--border] bg-[--bg-secondary] px-2 py-1.5"
								>
									<div className="flex items-center justify-between">
										<span className="text-[10px] font-mono text-[--text-primary]">{task.id}</span>
										<span
											className={`text-[10px] font-mono font-medium ${sigmaColor(task.sigmaEstimate)}`}
										>
											{"\u03C3"}
											{task.sigmaEstimate.toFixed(2)} {sigmaLabel(task.sigmaEstimate)}
										</span>
									</div>
									<p className="text-[10px] text-[--text-muted] mt-0.5 line-clamp-2">
										{task.description}
									</p>
									<div className="flex items-center gap-2 mt-1">
										<span className="text-[9px] px-1 py-0.5 rounded bg-[--bg-tertiary] text-[--text-secondary]">
											{task.agentRole}
										</span>
										<span className="text-[9px] text-emerald-400/70 font-mono">
											${task.estimatedCost.toFixed(2)}
										</span>
										{task.dependencies.length > 0 && (
											<span className="text-[9px] text-[--text-muted]">
												dep: {task.dependencies.join(", ")}
											</span>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Run History */}
				<div>
					<div className="flex items-center gap-2 mb-2">
						<span className="text-xs font-medium text-[--text-primary]">Run History</span>
					</div>
					<RunHistory projectId={projectId} />
				</div>
			</div>
		</div>
	);
}
