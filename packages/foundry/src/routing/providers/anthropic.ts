/**
 * Anthropic provider client.
 * Wraps @anthropic-ai/sdk for Claude models.
 */

import Anthropic from "@anthropic-ai/sdk";

import type {
	ChatMessage,
	ChatOptions,
	ChatResponse,
	FoundryModelClient,
	ProviderConfig,
} from "../types.js";

export class AnthropicClient implements FoundryModelClient {
	private readonly client: Anthropic;
	private readonly model: string;

	constructor(config: ProviderConfig) {
		this.model = config.model;
		this.client = new Anthropic({ apiKey: config.apiKey });
	}

	async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
		// Anthropic requires system message to be passed separately
		const systemMessages = messages.filter((m) => m.role === "system");
		const nonSystemMessages = messages.filter((m) => m.role !== "system");

		const systemText = systemMessages.map((m) => m.content).join("\n\n");

		const response = await this.client.messages.create({
			model: this.model,
			max_tokens: options?.maxTokens ?? 4096,
			system: systemText || undefined,
			messages: nonSystemMessages.map((m) => ({
				role: m.role as "user" | "assistant",
				content: m.content,
			})),
			temperature: options?.temperature,
		});

		const textBlock = response.content.find((b) => b.type === "text");
		return {
			content: textBlock?.text ?? "",
			inputTokens: response.usage.input_tokens,
			outputTokens: response.usage.output_tokens,
			model: response.model,
		};
	}
}
