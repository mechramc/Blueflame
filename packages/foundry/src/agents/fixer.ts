/**
 * Fixer Agent — CI/CD failure analysis via Foundry Models (Azure OpenAI).
 *
 * Analyzes normalized failures and produces root cause analysis
 * with remediation tasks. Output feeds into remediation authorization gate.
 *
 * Source: Blueflame-Spec-v3-ACAR.md Section 10.4
 */

import type { NormalizedFailure, RemediationTask, RootCauseAnalysis } from "@blueflame/shared";
import OpenAI from "openai";
import { FIXER_SYSTEM_PROMPT } from "./prompts/fixer-system.js";

export interface FixerConfig {
	/** Azure OpenAI or Foundry endpoint */
	endpoint: string;
	/** API key */
	apiKey: string;
	/** Deployment name (e.g., "gpt-4o") */
	deployment: string;
	/** API version (default: "2024-10-21") */
	apiVersion?: string;
}

export interface FixerOutput {
	failureId: string;
	rootCause: RootCauseAnalysis;
}

export interface FixerError {
	failureId: string;
	error: string;
}

export type FixerResult = { ok: true; value: FixerOutput } | { ok: false; error: FixerError };

/**
 * Creates an Azure OpenAI client for the Fixer agent.
 */
function createClient(config: FixerConfig): OpenAI {
	return new OpenAI({
		apiKey: config.apiKey,
		baseURL: `${config.endpoint}/openai/deployments/${config.deployment}`,
		defaultQuery: { "api-version": config.apiVersion ?? "2024-10-21" },
		defaultHeaders: { "api-key": config.apiKey },
	});
}

/**
 * Builds the user prompt for failure analysis.
 */
export function buildFixerPrompt(failure: NormalizedFailure): string {
	const parts: string[] = [
		`## Failure: ${failure.failureId}`,
		"",
		`**Source**: ${failure.source}`,
		`**Type**: ${failure.failureType}`,
		`**Pipeline**: ${failure.pipelineId} (Build #${failure.buildNumber})`,
		`**Branch**: ${failure.branchRef}`,
		`**Commit**: ${failure.commitSha}`,
		`**Environment**: ${failure.environment.os} / ${failure.environment.runtimeVersion}`,
		"",
	];

	if (failure.failedSteps.length > 0) {
		parts.push("## Failed Steps");
		for (const step of failure.failedSteps) {
			parts.push(`### ${step.name} (exit code: ${step.exitCode})`);
			if (step.logExcerpt) {
				parts.push("```", step.logExcerpt, "```");
			}
		}
		parts.push("");
	}

	if (failure.testResults) {
		const tr = failure.testResults;
		parts.push(
			"## Test Results",
			`Total: ${tr.total} | Passed: ${tr.passed} | Failed: ${tr.failed} | Skipped: ${tr.skipped}`,
		);
		if (tr.details.length > 0) {
			parts.push("");
			for (const d of tr.details) {
				parts.push(`- **${d.testName}**: ${d.errorMessage}`);
			}
		}
		parts.push("");
	}

	if (failure.rawLogUrl) {
		parts.push(`## Full Log: ${failure.rawLogUrl}`);
	}

	return parts.join("\n");
}

/**
 * Calls the Fixer LLM to analyze a failure and produce root cause + remediation.
 */
export async function analyzeFailure(
	config: FixerConfig,
	failure: NormalizedFailure,
): Promise<FixerResult> {
	const client = createClient(config);
	const userPrompt = buildFixerPrompt(failure);

	const response = await client.chat.completions.create({
		model: config.deployment,
		messages: [
			{ role: "system", content: FIXER_SYSTEM_PROMPT },
			{ role: "user", content: userPrompt },
		],
		temperature: 0.1,
		max_tokens: 4096,
	});

	const content = response.choices[0]?.message?.content ?? "";
	return parseFixerOutput(content, failure.failureId);
}

/**
 * Parses raw LLM output into a FixerResult.
 */
export function parseFixerOutput(raw: string, failureId: string): FixerResult {
	const cleaned = cleanJsonOutput(raw);
	const parsed = JSON.parse(cleaned) as Record<string, unknown>;

	const summary = String(parsed.summary ?? "");
	const rootCause = String(parsed.rootCause ?? "");
	const confidence = Number(parsed.confidence ?? 0);
	const affectedFiles = Array.isArray(parsed.affectedFiles)
		? (parsed.affectedFiles as string[]).map(String)
		: [];

	const remediationTasks: RemediationTask[] = Array.isArray(parsed.remediationTasks)
		? (parsed.remediationTasks as Array<Record<string, unknown>>).map((t) => ({
				id: String(t.id ?? ""),
				description: String(t.description ?? ""),
				estimatedSigma: Number(t.estimatedSigma ?? 3),
				estimatedCost: Number(t.estimatedCost ?? 0),
				agentRole: String(t.agentRole ?? "BUILDER"),
			}))
		: [];

	return {
		ok: true,
		value: {
			failureId: String(parsed.failureId ?? failureId),
			rootCause: {
				summary,
				rootCause,
				confidence,
				affectedFiles,
				remediationTasks,
			},
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
