/**
 * Designer Agent — requirement elicitation via Foundry Models (Azure OpenAI).
 *
 * Streams responses token-by-token. The caller is responsible for
 * forwarding tokens to SignalR or any other transport.
 */

import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { DESIGNER_SYSTEM_PROMPT } from "./prompts/designer-system.js";
import { getAzureBaseURL } from "../routing/types.js";

export interface DesignerConfig {
	/** Azure OpenAI or Foundry endpoint (e.g., https://<resource>.openai.azure.com) */
	endpoint: string;
	/** API key */
	apiKey: string;
	/** Deployment name (e.g., "gpt-4o") */
	deployment: string;
	/** API version (default: "2024-10-21") */
	apiVersion?: string;
}

export interface StreamCallbacks {
	/** Called for each token chunk */
	onToken: (token: string) => void;
	/** Called when streaming is complete with the full response */
	onComplete: (fullResponse: string) => void;
	/** Called on error */
	onError: (error: Error) => void;
}

/**
 * Creates an Azure OpenAI client configured for the Designer agent.
 */
function createClient(config: DesignerConfig): OpenAI {
	return new OpenAI({
		apiKey: config.apiKey,
		baseURL: getAzureBaseURL(config.endpoint, config.deployment),
		defaultQuery: { "api-version": config.apiVersion ?? "2024-10-21" },
		defaultHeaders: { "api-key": config.apiKey },
	});
}

/**
 * Converts ChatMessage-style history into OpenAI message format.
 */
export function toOpenAIMessages(
	history: Array<{ role: "user" | "agent"; content: string }>,
): ChatCompletionMessageParam[] {
	const messages: ChatCompletionMessageParam[] = [
		{ role: "system", content: DESIGNER_SYSTEM_PROMPT },
	];

	for (const msg of history) {
		messages.push({
			role: msg.role === "agent" ? "assistant" : "user",
			content: msg.content,
		});
	}

	return messages;
}

/**
 * Streams a Designer agent response given conversation history.
 *
 * @returns A promise that resolves when streaming is complete.
 */
export async function streamDesignerResponse(
	config: DesignerConfig,
	history: Array<{ role: "user" | "agent"; content: string }>,
	callbacks: StreamCallbacks,
): Promise<void> {
	const client = createClient(config);
	const messages = toOpenAIMessages(history);

	try {
		const stream = await client.chat.completions.create({
			model: config.deployment,
			messages,
			stream: true,
			temperature: 0.7,
			max_tokens: 4096,
		});

		let fullResponse = "";

		for await (const chunk of stream) {
			const delta = chunk.choices[0]?.delta?.content;
			if (delta) {
				fullResponse += delta;
				callbacks.onToken(delta);
			}
		}

		callbacks.onComplete(fullResponse);
	} catch (err) {
		callbacks.onError(err instanceof Error ? err : new Error(String(err)));
	}
}
