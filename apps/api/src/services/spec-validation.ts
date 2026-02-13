/**
 * Spec Validation — schema check (YAML parse) + policy check (constraints).
 *
 * Returns structured validation results for the validation panel.
 */

import { parse as yamlParse } from "yaml";

export interface SchemaCheckResult {
	valid: boolean;
	errors: string[];
}

export interface PolicyViolation {
	rule: string;
	message: string;
	severity: "error" | "warning";
}

export interface PolicyCheckResult {
	valid: boolean;
	violations: PolicyViolation[];
}

export interface BudgetEstimate {
	estimatedCost: number;
	taskCount: number;
	modelTier: string;
}

export interface ValidationResult {
	schema: SchemaCheckResult;
	policy: PolicyCheckResult;
	budget: BudgetEstimate;
}

/**
 * Validate YAML schema — parse and check required fields.
 */
export function validateSpecSchema(content: string): SchemaCheckResult {
	const errors: string[] = [];

	if (!content || content.trim().length === 0) {
		return { valid: false, errors: ["Spec content is empty"] };
	}

	let parsed: Record<string, unknown>;
	try {
		parsed = yamlParse(content) as Record<string, unknown>;
	} catch (err) {
		return {
			valid: false,
			errors: [`YAML parse error: ${err instanceof Error ? err.message : "Invalid YAML"}`],
		};
	}

	if (!parsed || typeof parsed !== "object") {
		return { valid: false, errors: ["Spec must be a YAML object"] };
	}

	// Check required fields
	const requiredFields = ["title", "description", "deliverables", "acceptance_criteria"];
	for (const field of requiredFields) {
		if (!(field in parsed) || parsed[field] === null || parsed[field] === undefined) {
			errors.push(`Missing required field: ${field}`);
		}
	}

	// Check deliverables is an array
	if ("deliverables" in parsed && !Array.isArray(parsed.deliverables)) {
		errors.push("deliverables must be an array");
	} else if (Array.isArray(parsed.deliverables) && parsed.deliverables.length === 0) {
		errors.push("deliverables must not be empty");
	}

	// Check acceptance_criteria is an array
	if ("acceptance_criteria" in parsed && !Array.isArray(parsed.acceptance_criteria)) {
		errors.push("acceptance_criteria must be an array");
	} else if (Array.isArray(parsed.acceptance_criteria) && parsed.acceptance_criteria.length === 0) {
		errors.push("acceptance_criteria must not be empty");
	}

	// Check constraints structure
	if ("constraints" in parsed && parsed.constraints !== null) {
		const constraints = parsed.constraints as Record<string, unknown>;
		if (typeof constraints !== "object") {
			errors.push("constraints must be an object with must/must_not arrays");
		}
	}

	return { valid: errors.length === 0, errors };
}

/**
 * Validate spec against policy constraints.
 */
export function validateSpecPolicy(
	content: string,
	projectConstraints?: string[],
): PolicyCheckResult {
	const violations: PolicyViolation[] = [];

	let parsed: Record<string, unknown>;
	try {
		parsed = yamlParse(content) as Record<string, unknown>;
	} catch {
		return {
			valid: false,
			violations: [
				{ rule: "PARSE", message: "Cannot parse YAML for policy check", severity: "error" },
			],
		};
	}

	if (!parsed || typeof parsed !== "object") {
		return {
			valid: false,
			violations: [{ rule: "FORMAT", message: "Spec must be a YAML object", severity: "error" }],
		};
	}

	// Policy: Title must be descriptive (> 5 chars)
	if (typeof parsed.title === "string" && parsed.title.length < 5) {
		violations.push({
			rule: "TITLE_LENGTH",
			message: "Title should be descriptive (at least 5 characters)",
			severity: "warning",
		});
	}

	// Policy: Must have at least one risk identified
	if (!Array.isArray(parsed.risks) || parsed.risks.length === 0) {
		violations.push({
			rule: "RISK_ASSESSMENT",
			message: "Spec should include at least one identified risk",
			severity: "warning",
		});
	}

	// Policy: Must have definition_of_done
	if (
		!parsed.definition_of_done ||
		(typeof parsed.definition_of_done === "string" && parsed.definition_of_done.trim().length === 0)
	) {
		violations.push({
			rule: "DEFINITION_OF_DONE",
			message: "Spec must include a definition of done",
			severity: "error",
		});
	}

	// Policy: Check against project-level constraints
	if (projectConstraints && projectConstraints.length > 0) {
		const constraintBlock = parsed.constraints as Record<string, unknown> | undefined;
		const mustConstraints = Array.isArray(constraintBlock?.must)
			? (constraintBlock.must as string[])
			: [];
		const allConstraintText = mustConstraints.join(" ").toLowerCase();

		for (const required of projectConstraints) {
			if (!allConstraintText.includes(required.toLowerCase())) {
				violations.push({
					rule: "PROJECT_CONSTRAINT",
					message: `Project constraint not addressed: "${required}"`,
					severity: "warning",
				});
			}
		}
	}

	const hasErrors = violations.some((v) => v.severity === "error");
	return { valid: !hasErrors, violations };
}

/**
 * Estimate budget for executing a spec.
 */
export function estimateSpecBudget(content: string): BudgetEstimate {
	let parsed: Record<string, unknown>;
	try {
		parsed = yamlParse(content) as Record<string, unknown>;
	} catch {
		return { estimatedCost: 0, taskCount: 0, modelTier: "unknown" };
	}

	if (!parsed || typeof parsed !== "object") {
		return { estimatedCost: 0, taskCount: 0, modelTier: "unknown" };
	}

	// Estimate task count from deliverables + acceptance criteria
	const deliverables = Array.isArray(parsed.deliverables) ? parsed.deliverables.length : 0;
	const criteria = Array.isArray(parsed.acceptance_criteria)
		? parsed.acceptance_criteria.length
		: 0;

	// Rough estimate: each deliverable = ~2 tasks (build + verify), each criterion = ~1 verification task
	const taskCount = deliverables * 2 + criteria;

	// Cost estimate: ~$0.05 per task (avg across model tiers with σ-routing)
	const estimatedCost = taskCount * 0.05;

	// Model tier based on complexity
	const modelTier =
		taskCount > 20
			? "high (o1/opus)"
			: taskCount > 10
				? "medium (gpt-4o/sonnet)"
				: "standard (gpt-4o-mini/haiku)";

	return { estimatedCost, taskCount, modelTier };
}

/**
 * Run full validation on spec content.
 */
export function validateSpec(content: string, projectConstraints?: string[]): ValidationResult {
	return {
		schema: validateSpecSchema(content),
		policy: validateSpecPolicy(content, projectConstraints),
		budget: estimateSpecBudget(content),
	};
}
