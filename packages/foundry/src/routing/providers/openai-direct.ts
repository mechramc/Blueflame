/**
 * OpenAI Direct provider client.
 * Uses the openai SDK without Azure-specific configuration.
 */

import OpenAI from "openai";

import type {
	ChatMessage,
	ChatOptions,
	ChatResponse,
	FoundryModelClient,
	ProviderConfig,
} from "../types.js";

export class OpenAIDirectClient implements FoundryModelClient {
	private readonly client: OpenAI;
	private readonly model: string;

	constructor(config: ProviderConfig) {
		this.model = config.model;
		this.client = new OpenAI({ apiKey: config.apiKey });
	}

	async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
		const response = await this.client.chat.completions.create({
			model: this.model,
			messages: messages.map((m) => ({ role: m.role, content: m.content })),
			temperature: options?.temperature,
			max_tokens: options?.maxTokens,
		});

		const choice = response.choices[0];
		return {
			content: choice?.message?.content ?? "",
			inputTokens: response.usage?.prompt_tokens ?? 0,
			outputTokens: response.usage?.completion_tokens ?? 0,
			model: response.model ?? this.model,
		};
	}
}
