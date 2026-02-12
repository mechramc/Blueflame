/**
 * Google Generative AI provider client.
 * Wraps @google/generative-ai for Gemini models.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

import type {
	ChatMessage,
	ChatOptions,
	ChatResponse,
	FoundryModelClient,
	ProviderConfig,
} from "../types.js";

export class GoogleClient implements FoundryModelClient {
	private readonly genAI: GoogleGenerativeAI;
	private readonly model: string;

	constructor(config: ProviderConfig) {
		this.model = config.model;
		this.genAI = new GoogleGenerativeAI(config.apiKey);
	}

	async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
		const generativeModel = this.genAI.getGenerativeModel({
			model: this.model,
			generationConfig: {
				temperature: options?.temperature,
				maxOutputTokens: options?.maxTokens,
			},
		});

		// Extract system instruction
		const systemMessages = messages.filter((m) => m.role === "system");
		const nonSystemMessages = messages.filter((m) => m.role !== "system");

		// Map to Google Content format
		const contents = nonSystemMessages.map((m) => ({
			role: m.role === "assistant" ? "model" : "user",
			parts: [{ text: m.content }],
		}));

		const result = await generativeModel.generateContent({
			contents,
			systemInstruction:
				systemMessages.length > 0
					? { role: "user", parts: [{ text: systemMessages.map((m) => m.content).join("\n\n") }] }
					: undefined,
		});

		const response = result.response;
		const text = response.text();
		const usage = response.usageMetadata;

		return {
			content: text,
			inputTokens: usage?.promptTokenCount ?? 0,
			outputTokens: usage?.candidatesTokenCount ?? 0,
			model: this.model,
		};
	}
}
