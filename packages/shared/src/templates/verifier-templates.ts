/**
 * Pre-packaged Verifier templates for common CI checks.
 *
 * Each template defines acceptance criteria, commands, and pass/fail
 * parsing rules that the Verifier agent can consume.
 */

/** Verifier template definition */
export interface VerifierTemplate {
	id: string;
	name: string;
	description: string;
	/** Shell command to run */
	command: string;
	/** Regex pattern that indicates success (matched against stdout) */
	passPattern: string;
	/** Regex pattern that indicates failure (matched against stderr or stdout) */
	failPattern: string;
	/** Acceptance criteria text for the Verifier prompt */
	acceptanceCriteria: string;
	/** Category for grouping */
	category: "lint" | "typecheck" | "deps" | "test" | "format";
}

/** ESLint / Biome lint check */
export const VERIFIER_LINT: VerifierTemplate = {
	id: "verifier-lint",
	name: "Lint Check",
	description: "Run Biome linter on all source files and verify zero errors",
	command: "npx biome check .",
	passPattern: "Checked \\d+ files? in \\d+",
	failPattern: "Found \\d+ errors?",
	acceptanceCriteria: "All source files pass Biome lint rules with zero errors",
	category: "lint",
};

/** TypeScript strict type check */
export const VERIFIER_TYPECHECK: VerifierTemplate = {
	id: "verifier-typecheck",
	name: "TypeScript Strict Check",
	description: "Run TypeScript compiler in strict mode with no emit to verify type safety",
	command: "npx tsc --noEmit",
	passPattern: "^$",
	failPattern: "error TS\\d+",
	acceptanceCriteria: "TypeScript compiles with strict mode enabled and zero type errors",
	category: "typecheck",
};

/** Dependency audit */
export const VERIFIER_DEPS: VerifierTemplate = {
	id: "verifier-deps",
	name: "Dependency Audit",
	description: "Run npm audit to check for known vulnerabilities in dependencies",
	command: "npm audit --audit-level=high",
	passPattern: "found 0 vulnerabilities",
	failPattern: "\\d+ (high|critical)",
	acceptanceCriteria: "No high or critical severity vulnerabilities in npm dependencies",
	category: "deps",
};

/** Vitest test suite with coverage */
export const VERIFIER_TEST: VerifierTemplate = {
	id: "verifier-test",
	name: "Test Suite",
	description: "Run Vitest test suite and verify all tests pass with minimum coverage",
	command: "npx vitest run --reporter=verbose --coverage",
	passPattern: "Tests\\s+\\d+ passed",
	failPattern: "Tests\\s+\\d+ failed",
	acceptanceCriteria: "All unit tests pass and code coverage meets minimum threshold (80%)",
	category: "test",
};

/** Biome format check */
export const VERIFIER_FORMAT: VerifierTemplate = {
	id: "verifier-format",
	name: "Format Check",
	description: "Run Biome formatter check to verify consistent code formatting",
	command: "npx biome format --check .",
	passPattern: "Checked \\d+ files? in \\d+",
	failPattern: "Formatter would have printed",
	acceptanceCriteria: "All source files conform to Biome formatting rules",
	category: "format",
};

/** All available verifier templates */
export const ALL_VERIFIER_TEMPLATES: VerifierTemplate[] = [
	VERIFIER_LINT,
	VERIFIER_TYPECHECK,
	VERIFIER_DEPS,
	VERIFIER_TEST,
	VERIFIER_FORMAT,
];

/**
 * Get a verifier template by ID.
 */
export function getVerifierTemplate(id: string): VerifierTemplate | undefined {
	return ALL_VERIFIER_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get verifier templates by category.
 */
export function getTemplatesByCategory(category: VerifierTemplate["category"]): VerifierTemplate[] {
	return ALL_VERIFIER_TEMPLATES.filter((t) => t.category === category);
}
