/**
 * Builder Agent — code generation via Foundry Models (Azure OpenAI).
 *
 * Takes a task from a PlanLock and generates code files.
 * Returns structured output with files, commit message, and PR metadata.
 */

import OpenAI from "openai";
import { BUILDER_SYSTEM_PROMPT } from "./prompts/builder-system.js";
import { getAzureBaseURL, getAzureDefaultQuery } from "../routing/types.js";

export interface BuilderConfig {
	/** Azure OpenAI or Foundry endpoint */
	endpoint: string;
	/** API key */
	apiKey: string;
	/** Deployment name (e.g., "gpt-4o") */
	deployment: string;
	/** API version (default: "2024-12-01-preview") */
	apiVersion?: string;
}

export interface BuilderTaskInput {
	/** Task ID (e.g., "TASK-001") */
	taskId: string;
	/** Task description */
	description: string;
	/** Acceptance criteria IDs this task must satisfy */
	acceptanceCriteriaIds: string[];
	/** Spec content for context */
	specContext: string;
	/** Existing code files for reference */
	existingFiles?: Array<{ path: string; content: string }>;
	/** Project constraints */
	constraints?: string[];
}

/** A single file output from the Builder */
export interface BuilderFileOutput {
	path: string;
	content: string;
	action: "create" | "modify";
}

/** Successful Builder output */
export interface BuilderOutput {
	files: BuilderFileOutput[];
	commitMessage: string;
	prTitle: string;
	prBody: string;
	notes: string;
}

/** Error Builder output */
export interface BuilderError {
	error: string;
	suggestions: string[];
}

export type BuilderResult = { ok: true; value: BuilderOutput } | { ok: false; error: BuilderError };

/**
 * Creates an Azure OpenAI client for the Builder agent.
 */
function createClient(config: BuilderConfig): OpenAI {
	return new OpenAI({
		apiKey: config.apiKey,
		baseURL: getAzureBaseURL(config.endpoint, config.deployment),
		defaultQuery: getAzureDefaultQuery(config.deployment, config.apiVersion),
		defaultHeaders: { "api-key": config.apiKey },
	});
}

/**
 * Builds the user prompt from a task input.
 */
export function buildBuilderPrompt(input: BuilderTaskInput): string {
	const parts: string[] = [
		`## Task: ${input.taskId}`,
		`**Description:** ${input.description}`,
		`**Acceptance Criteria:** ${input.acceptanceCriteriaIds.join(", ")}`,
		"",
		"## Specification Context",
		input.specContext,
	];

	if (input.constraints && input.constraints.length > 0) {
		parts.push("", "## Constraints");
		for (const c of input.constraints) {
			parts.push(`- ${c}`);
		}
	}

	if (input.existingFiles && input.existingFiles.length > 0) {
		parts.push("", "## Existing Code");
		for (const f of input.existingFiles) {
			parts.push(`### ${f.path}`, "```typescript", f.content, "```");
		}
	}

	return parts.join("\n");
}

/**
 * Calls the Builder LLM to generate code for a task.
 */
export async function generateCode(
	config: BuilderConfig,
	input: BuilderTaskInput,
): Promise<BuilderResult> {
	const client = createClient(config);
	const userPrompt = buildBuilderPrompt(input);

	const response = await client.chat.completions.create({
		model: config.deployment,
		messages: [
			{ role: "system", content: BUILDER_SYSTEM_PROMPT },
			{ role: "user", content: userPrompt },
		],
		temperature: 0.2,
		max_tokens: 8192,
	});

	const content = response.choices[0]?.message?.content ?? "";
	return parseBuilderOutput(content);
}

/**
 * Parses the raw LLM output into a structured BuilderResult.
 */
export function parseBuilderOutput(raw: string): BuilderResult {
	const cleaned = cleanJsonOutput(raw);
	const parsed = JSON.parse(cleaned) as Record<string, unknown>;

	// Check for error response
	if ("error" in parsed && typeof parsed.error === "string") {
		return {
			ok: false,
			error: {
				error: parsed.error,
				suggestions: Array.isArray(parsed.suggestions) ? (parsed.suggestions as string[]) : [],
			},
		};
	}

	// Parse success response
	if (!Array.isArray(parsed.files) || parsed.files.length === 0) {
		return {
			ok: false,
			error: {
				error: "Builder output must contain at least one file",
				suggestions: ["Ensure the task description is clear enough for code generation"],
			},
		};
	}

	const files: BuilderFileOutput[] = (parsed.files as Array<Record<string, unknown>>).map((f) => ({
		path: String(f.path ?? ""),
		content: String(f.content ?? ""),
		action: f.action === "modify" ? "modify" : "create",
	}));

	return {
		ok: true,
		value: {
			files,
			commitMessage: String(parsed.commit_message ?? ""),
			prTitle: String(parsed.pr_title ?? ""),
			prBody: String(parsed.pr_body ?? ""),
			notes: String(parsed.notes ?? ""),
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
