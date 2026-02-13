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

/** Safely parse YAML content into an object, or return null */
function safeParse(content: string): Record<string, unknown> | null {
	try {
		const parsed = yamlParse(content) as Record<string, unknown>;
		return parsed && typeof parsed === "object" ? parsed : null;
	} catch {
		return null;
	}
}

/** Check that required fields exist in parsed spec */
function checkRequiredFields(parsed: Record<string, unknown>, errors: string[]): void {
	const required = ["title", "description", "deliverables", "acceptance_criteria"];
	for (const field of required) {
		if (!(field in parsed) || parsed[field] === null || parsed[field] === undefined) {
			errors.push(`Missing required field: ${field}`);
		}
	}
}

/** Validate a field is a non-empty array */
function checkNonEmptyArray(
	parsed: Record<string, unknown>,
	field: string,
	errors: string[],
): void {
	if (field in parsed && !Array.isArray(parsed[field])) {
		errors.push(`${field} must be an array`);
	} else if (Array.isArray(parsed[field]) && (parsed[field] as unknown[]).length === 0) {
		errors.push(`${field} must not be empty`);
	}
}

/**
 * Validate YAML schema — parse and check required fields.
 */
export function validateSpecSchema(content: string): SchemaCheckResult {
	if (!content || content.trim().length === 0) {
		return { valid: false, errors: ["Spec content is empty"] };
	}

	const parsed = safeParse(content);
	if (!parsed) {
		return { valid: false, errors: ["YAML parse error or spec is not a valid object"] };
	}

	const errors: string[] = [];
	checkRequiredFields(parsed, errors);
	checkNonEmptyArray(parsed, "deliverables", errors);
	checkNonEmptyArray(parsed, "acceptance_criteria", errors);

	if (
		"constraints" in parsed &&
		parsed.constraints !== null &&
		typeof parsed.constraints !== "object"
	) {
		errors.push("constraints must be an object with must/must_not arrays");
	}

	return { valid: errors.length === 0, errors };
}

/** Check built-in policy rules against parsed spec */
function checkBuiltInPolicies(
	parsed: Record<string, unknown>,
	violations: PolicyViolation[],
): void {
	if (typeof parsed.title === "string" && parsed.title.length < 5) {
		violations.push({
			rule: "TITLE_LENGTH",
			message: "Title should be descriptive (at least 5 characters)",
			severity: "warning",
		});
	}
	if (!Array.isArray(parsed.risks) || parsed.risks.length === 0) {
		violations.push({
			rule: "RISK_ASSESSMENT",
			message: "Spec should include at least one identified risk",
			severity: "warning",
		});
	}
	const dod = parsed.definition_of_done;
	if (!dod || (typeof dod === "string" && dod.trim().length === 0)) {
		violations.push({
			rule: "DEFINITION_OF_DONE",
			message: "Spec must include a definition of done",
			severity: "error",
		});
	}
}

/** Check project-level constraints are addressed */
function checkProjectConstraints(
	parsed: Record<string, unknown>,
	constraints: string[],
	violations: PolicyViolation[],
): void {
	const constraintBlock = parsed.constraints as Record<string, unknown> | undefined;
	const mustConstraints = Array.isArray(constraintBlock?.must)
		? (constraintBlock.must as string[])
		: [];
	const allText = mustConstraints.join(" ").toLowerCase();

	for (const required of constraints) {
		if (!allText.includes(required.toLowerCase())) {
			violations.push({
				rule: "PROJECT_CONSTRAINT",
				message: `Project constraint not addressed: "${required}"`,
				severity: "warning",
			});
		}
	}
}

/**
 * Validate spec against policy constraints.
 */
export function validateSpecPolicy(
	content: string,
	projectConstraints?: string[],
): PolicyCheckResult {
	const parsed = safeParse(content);
	if (!parsed) {
		return {
			valid: false,
			violations: [
				{ rule: "PARSE", message: "Cannot parse YAML for policy check", severity: "error" },
			],
		};
	}

	const violations: PolicyViolation[] = [];
	checkBuiltInPolicies(parsed, violations);

	if (projectConstraints && projectConstraints.length > 0) {
		checkProjectConstraints(parsed, projectConstraints, violations);
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
