/**
 * Explainer Agent — PR description generation via Foundry Models (Azure OpenAI).
 *
 * Reads diffs, Verifier results, and spec context to generate
 * comprehensive PR descriptions with acceptance criteria attribution.
 */

import OpenAI from "openai";
import { EXPLAINER_SYSTEM_PROMPT } from "./prompts/explainer-system.js";
import { getAzureBaseURL, getAzureDefaultQuery } from "../routing/types.js";

export interface ExplainerConfig {
	/** Azure OpenAI or Foundry endpoint */
	endpoint: string;
	/** API key */
	apiKey: string;
	/** Deployment name (e.g., "gpt-4o") */
	deployment: string;
	/** API version (default: "2024-12-01-preview") */
	apiVersion?: string;
}

export interface ExplainerInput {
	/** Run ID */
	runId: string;
	/** Task IDs included in this PR */
	taskIds: string[];
	/** Code diffs from GitHub Diff API */
	diffs: string;
	/** Verifier results per criterion */
	verifierResults: Array<{
		criterionId: string;
		result: "PASS" | "FAIL";
		evidence: string;
	}>;
	/** Frozen spec context */
	specContext: string;
	/** Constraint names to check compliance */
	constraints?: string[];
	/** Whether this is a bug-fix run */
	isBugFix?: boolean;
}

/** Acceptance criteria mapping in the output */
export interface CriterionMapping {
	criterionId: string;
	status: "SATISFIED" | "NOT_SATISFIED" | "UNCERTAIN";
	evidence: string;
	filesChanged: string[];
}

/** Constraint compliance entry */
export interface ConstraintComplianceEntry {
	constraint: string;
	compliant: boolean;
	evidence: string;
}

/** Explainer output */
export interface ExplainerOutput {
	prTitle: string;
	prBody: string;
	acceptanceCriteriaMap: CriterionMapping[];
	constraintCompliance: ConstraintComplianceEntry[];
	rootCauseAnalysis: string | null;
	summary: string;
}

export type ExplainerResult = { ok: true; value: ExplainerOutput } | { ok: false; error: string };

/**
 * Creates an Azure OpenAI client for the Explainer agent.
 */
function createClient(config: ExplainerConfig): OpenAI {
	return new OpenAI({
		apiKey: config.apiKey,
		baseURL: getAzureBaseURL(config.endpoint, config.deployment),
		defaultQuery: getAzureDefaultQuery(config.deployment, config.apiVersion),
		defaultHeaders: { "api-key": config.apiKey },
	});
}

/**
 * Builds the user prompt for the Explainer.
 */
export function buildExplainerPrompt(input: ExplainerInput): string {
	const parts: string[] = [
		`## Run: ${input.runId}`,
		`## Tasks: ${input.taskIds.join(", ")}`,
		input.isBugFix ? "**Type: Bug Fix**" : "**Type: Feature**",
		"",
		"## Code Diffs",
		"```diff",
		input.diffs,
		"```",
		"",
		"## Verifier Results",
	];

	for (const vr of input.verifierResults) {
		parts.push(`- **${vr.criterionId}**: ${vr.result} — ${vr.evidence}`);
	}

	parts.push("", "## Specification Context", input.specContext);

	if (input.constraints && input.constraints.length > 0) {
		parts.push("", "## Constraints to Check");
		for (const c of input.constraints) {
			parts.push(`- ${c}`);
		}
	}

	return parts.join("\n");
}

/**
 * Calls the Explainer LLM to generate a PR description.
 */
export async function generateExplanation(
	config: ExplainerConfig,
	input: ExplainerInput,
): Promise<ExplainerResult> {
	const client = createClient(config);
	const userPrompt = buildExplainerPrompt(input);

	const response = await client.chat.completions.create({
		model: config.deployment,
		messages: [
			{ role: "system", content: EXPLAINER_SYSTEM_PROMPT },
			{ role: "user", content: userPrompt },
		],
		temperature: 0.3,
		max_tokens: 4096,
	});

	const content = response.choices[0]?.message?.content ?? "";
	return parseExplainerOutput(content);
}

/**
 * Parses the raw LLM output into an ExplainerResult.
 */
export function parseExplainerOutput(raw: string): ExplainerResult {
	const cleaned = cleanJsonOutput(raw);
	const parsed = JSON.parse(cleaned) as Record<string, unknown>;

	if (!parsed.prTitle || !parsed.prBody) {
		return { ok: false, error: "Explainer output must include prTitle and prBody" };
	}

	const acMap: CriterionMapping[] = Array.isArray(parsed.acceptanceCriteriaMap)
		? (parsed.acceptanceCriteriaMap as Array<Record<string, unknown>>).map((m) => ({
				criterionId: String(m.criterionId ?? ""),
				status: toStatus(String(m.status ?? "")),
				evidence: String(m.evidence ?? ""),
				filesChanged: Array.isArray(m.filesChanged) ? (m.filesChanged as string[]) : [],
			}))
		: [];

	const compliance: ConstraintComplianceEntry[] = Array.isArray(parsed.constraintCompliance)
		? (parsed.constraintCompliance as Array<Record<string, unknown>>).map((c) => ({
				constraint: String(c.constraint ?? ""),
				compliant: Boolean(c.compliant),
				evidence: String(c.evidence ?? ""),
			}))
		: [];

	return {
		ok: true,
		value: {
			prTitle: String(parsed.prTitle),
			prBody: String(parsed.prBody),
			acceptanceCriteriaMap: acMap,
			constraintCompliance: compliance,
			rootCauseAnalysis: parsed.rootCauseAnalysis != null ? String(parsed.rootCauseAnalysis) : null,
			summary: String(parsed.summary ?? ""),
		},
	};
}

function toStatus(s: string): "SATISFIED" | "NOT_SATISFIED" | "UNCERTAIN" {
	if (s === "SATISFIED") return "SATISFIED";
	if (s === "NOT_SATISFIED") return "NOT_SATISFIED";
	return "UNCERTAIN";
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
