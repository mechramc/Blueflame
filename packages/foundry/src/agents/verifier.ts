/**
 * Verifier Agent — CI evaluation via Foundry Models (Azure OpenAI).
 *
 * Receives CI results from GitHub Actions and evaluates them against
 * acceptance criteria. Uses acceptance criteria as ground truth.
 */

import OpenAI from "openai";
import { VERIFIER_SYSTEM_PROMPT } from "./prompts/verifier-system.js";
import { getApiVersion, getAzureBaseURL } from "../routing/types.js";

export interface VerifierConfig {
	/** Azure OpenAI or Foundry endpoint */
	endpoint: string;
	/** API key */
	apiKey: string;
	/** Deployment name (e.g., "gpt-4o") */
	deployment: string;
	/** API version (default: "2024-12-01-preview") */
	apiVersion?: string;
}

export interface VerifierInput {
	/** Task ID being verified */
	taskId: string;
	/** Acceptance criteria to evaluate against */
	acceptanceCriteria: Array<{ id: string; description: string }>;
	/** CI output from GitHub Actions */
	ciOutput: string;
	/** Whether the CI build passed overall */
	buildPassed: boolean;
	/** Notes from the Builder agent */
	builderNotes?: string;
	/** Summary of code diff */
	diffSummary?: string;
}

/** Result for a single criterion */
export interface CriterionResult {
	id: string;
	result: "PASS" | "FAIL";
	evidence: string;
	notes: string;
}

/** Successful Verifier output */
export interface VerifierOutput {
	taskId: string;
	overallResult: "PASS" | "FAIL" | "PARTIAL";
	criteria: CriterionResult[];
	buildPassed: boolean;
	testsPassed: number;
	testsFailed: number;
	lintErrors: number;
	summary: string;
}

/** Error Verifier output */
export interface VerifierError {
	taskId: string;
	overallResult: "FAIL";
	error: string;
}

export type VerifierResult =
	| { ok: true; value: VerifierOutput }
	| { ok: false; error: VerifierError };

/**
 * Creates an Azure OpenAI client for the Verifier agent.
 */
function createClient(config: VerifierConfig): OpenAI {
	return new OpenAI({
		apiKey: config.apiKey,
		baseURL: getAzureBaseURL(config.endpoint, config.deployment),
		defaultQuery: { "api-version": getApiVersion(config.deployment, config.apiVersion) },
		defaultHeaders: { "api-key": config.apiKey },
	});
}

/**
 * Builds the user prompt for verification.
 */
export function buildVerifierPrompt(input: VerifierInput): string {
	const parts: string[] = [`## Task: ${input.taskId}`, "", "## Acceptance Criteria"];

	for (const ac of input.acceptanceCriteria) {
		parts.push(`- **${ac.id}**: ${ac.description}`);
	}

	parts.push(
		"",
		`## Build Status: ${input.buildPassed ? "PASSED" : "FAILED"}`,
		"",
		"## CI Output",
		"```",
		input.ciOutput,
		"```",
	);

	if (input.builderNotes) {
		parts.push("", "## Builder Notes", input.builderNotes);
	}

	if (input.diffSummary) {
		parts.push("", "## Diff Summary", input.diffSummary);
	}

	return parts.join("\n");
}

/**
 * Calls the Verifier LLM to evaluate CI results against acceptance criteria.
 */
export async function verifyCIResults(
	config: VerifierConfig,
	input: VerifierInput,
): Promise<VerifierResult> {
	const client = createClient(config);
	const userPrompt = buildVerifierPrompt(input);

	const response = await client.chat.completions.create({
		model: config.deployment,
		messages: [
			{ role: "system", content: VERIFIER_SYSTEM_PROMPT },
			{ role: "user", content: userPrompt },
		],
		temperature: 0.1,
		max_tokens: 4096,
	});

	const content = response.choices[0]?.message?.content ?? "";
	return parseVerifierOutput(content);
}

/**
 * Parses raw LLM output into a VerifierResult.
 */
export function parseVerifierOutput(raw: string): VerifierResult {
	const cleaned = cleanJsonOutput(raw);
	const parsed = JSON.parse(cleaned) as Record<string, unknown>;

	// Check for error response
	if ("error" in parsed && typeof parsed.error === "string") {
		return {
			ok: false,
			error: {
				taskId: String(parsed.taskId ?? "unknown"),
				overallResult: "FAIL",
				error: parsed.error,
			},
		};
	}

	const overallResult = String(parsed.overallResult ?? "FAIL");
	if (overallResult !== "PASS" && overallResult !== "FAIL" && overallResult !== "PARTIAL") {
		return {
			ok: false,
			error: {
				taskId: String(parsed.taskId ?? "unknown"),
				overallResult: "FAIL",
				error: `Invalid overallResult: ${overallResult}`,
			},
		};
	}

	const criteria: CriterionResult[] = Array.isArray(parsed.criteria)
		? (parsed.criteria as Array<Record<string, unknown>>).map((c) => ({
				id: String(c.id ?? ""),
				result: c.result === "PASS" ? "PASS" : "FAIL",
				evidence: String(c.evidence ?? ""),
				notes: String(c.notes ?? ""),
			}))
		: [];

	return {
		ok: true,
		value: {
			taskId: String(parsed.taskId ?? "unknown"),
			overallResult,
			criteria,
			buildPassed: Boolean(parsed.buildPassed),
			testsPassed: Number(parsed.testsPassed ?? 0),
			testsFailed: Number(parsed.testsFailed ?? 0),
			lintErrors: Number(parsed.lintErrors ?? 0),
			summary: String(parsed.summary ?? ""),
		},
	};
}

/**
 * Strips markdown code fences from LLM output.
 */
function cleanJsonOutput(raw: string): string {
	let cleaned = raw.trim();
	if (cleaned.startsWith("```json")) {
		cleaned = cleaned.slice(7);
	} else if (cleaned.startsWith("```")) {
		cleaned = cleaned.slice(3);
	}
	if (cleaned.endsWith("```")) {
		cleaned = cleaned.slice(0, -3);
	}
	return cleaned.trim();
}
