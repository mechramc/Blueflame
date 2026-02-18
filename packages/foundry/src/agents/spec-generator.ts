/**
 * Spec Generator — produces structured YAML specs from conversation context.
 *
 * Uses Foundry Models (Azure OpenAI) with o1 or GPT-4o for complex reasoning.
 */

import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { SPEC_GENERATION_SYSTEM_PROMPT } from "./prompts/spec-generation-system.js";
import { getAzureBaseURL } from "../routing/types.js";

export interface SpecGeneratorConfig {
	/** Azure OpenAI or Foundry endpoint */
	endpoint: string;
	/** API key */
	apiKey: string;
	/** Deployment name (e.g., "gpt-4o" or "o1") */
	deployment: string;
	/** API version (default: "2024-10-21") */
	apiVersion?: string;
}

/**
 * Generates a YAML specification from conversation history.
 *
 * @returns The raw YAML string produced by the model.
 */
export async function generateSpec(
	config: SpecGeneratorConfig,
	conversationHistory: Array<{ role: "user" | "agent"; content: string }>,
): Promise<string> {
	const client = new OpenAI({
		apiKey: config.apiKey,
		baseURL: getAzureBaseURL(config.endpoint, config.deployment),
		defaultQuery: { "api-version": config.apiVersion ?? "2024-10-21" },
		defaultHeaders: { "api-key": config.apiKey },
	});

	const messages: ChatCompletionMessageParam[] = [
		{ role: "system", content: SPEC_GENERATION_SYSTEM_PROMPT },
		{
			role: "user",
			content: `Here is the conversation between the user and the Designer agent:\n\n${formatConversation(conversationHistory)}\n\nGenerate the YAML specification now.`,
		},
	];

	const response = await client.chat.completions.create({
		model: config.deployment,
		messages,
		temperature: 0.3,
		max_tokens: 2048,
	});

	const content = response.choices[0]?.message?.content;
	if (!content) {
		throw new Error("Spec generation returned empty response");
	}

	return cleanYaml(content);
}

/**
 * Formats conversation history into a readable transcript.
 */
function formatConversation(history: Array<{ role: "user" | "agent"; content: string }>): string {
	return history
		.map((msg) => {
			const label = msg.role === "user" ? "User" : "Designer Agent";
			return `${label}: ${msg.content}`;
		})
		.join("\n\n");
}

/**
 * Strips markdown code fences if the model wraps the YAML in them.
 */
function cleanYaml(raw: string): string {
	let cleaned = raw.trim();
	if (cleaned.startsWith("```yaml")) {
		cleaned = cleaned.slice(7);
	} else if (cleaned.startsWith("```")) {
		cleaned = cleaned.slice(3);
	}
	if (cleaned.endsWith("```")) {
		cleaned = cleaned.slice(0, -3);
	}
	return cleaned.trim();
}
