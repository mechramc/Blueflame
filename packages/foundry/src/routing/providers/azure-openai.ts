/**
 * Azure OpenAI provider client.
 * Reuses the baseURL + deployment + api-version pattern from existing agents.
 *
 * Includes retry with exponential backoff for 429 rate-limit errors,
 * and automatic fallback to gpt-4o-mini when catalog models (Phi-4, Llama)
 * are rate-limited on S0 tier.
 */

import OpenAI from "openai";

import {
	type ChatMessage,
	type ChatOptions,
	type ChatResponse,
	type FoundryModelClient,
	type ProviderConfig,
	getAzureBaseURL,
	getAzureDefaultQuery,
	isOpenAIModel,
	isReasoningModel,
} from "../types.js";

/** Max retry attempts before falling back or throwing */
const MAX_RETRIES = 2;

/** Base delay in ms for exponential backoff */
const BASE_DELAY_MS = 2000;

export class AzureOpenAIClient implements FoundryModelClient {
	private readonly client: OpenAI;
	private readonly model: string;
	private readonly config: ProviderConfig;

	constructor(config: ProviderConfig) {
		this.model = config.model;
		this.config = config;
		this.client = new OpenAI({
			apiKey: config.apiKey,
			baseURL: getAzureBaseURL(config.endpoint, config.model),
			defaultQuery: getAzureDefaultQuery(config.endpoint, config.model, config.apiVersion),
			defaultHeaders: { "api-key": config.apiKey },
			maxRetries: 0, // We handle retries ourselves for fallback control
		});
	}

	async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
		const mappedMessages = messages.map((m) => ({ role: m.role, content: m.content }));
		const reasoning = isReasoningModel(this.model);
		const tokenParam = options?.maxTokens
			? reasoning
				? { max_completion_tokens: options.maxTokens }
				: { max_tokens: options.maxTokens }
			: {};
		const requestBase: Omit<OpenAI.ChatCompletionCreateParamsNonStreaming, "model"> = {
			messages: mappedMessages as OpenAI.ChatCompletionMessageParam[],
			...(reasoning ? {} : { temperature: options?.temperature }),
			...tokenParam,
			...(options?.responseFormat && !reasoning ? { response_format: { type: "json_object" } } : {}),
		};

		// Try primary model with retries
		for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
			try {
				const response = await this.client.chat.completions.create({
					model: this.model,
					...requestBase,
				});

				const choice = response.choices[0];
				return {
					content: choice?.message?.content ?? "",
					inputTokens: response.usage?.prompt_tokens ?? 0,
					outputTokens: response.usage?.completion_tokens ?? 0,
					model: response.model ?? this.model,
				};
			} catch (err: unknown) {
				if (isRateLimitError(err) && attempt < MAX_RETRIES) {
					const delay = BASE_DELAY_MS * 2 ** attempt;
					console.warn(
						`[AzureOpenAI] 429 on ${this.model} (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms...`,
					);
					await sleep(delay);
					continue;
				}

				// If rate-limited after all retries and this is a catalog model, fall back
				if (isRateLimitError(err) && !isOpenAIModel(this.model)) {
					return this.fallbackToMini(requestBase);
				}

				throw err;
			}
		}

		// Unreachable, but TypeScript needs it
		throw new Error(`[AzureOpenAI] Exhausted retries for ${this.model}`);
	}

	/**
	 * Falls back to gpt-4o-mini when a catalog model is rate-limited.
	 * Creates a separate client with the OpenAI-model URL pattern.
	 */
	private async fallbackToMini(
		requestBase: Omit<OpenAI.ChatCompletionCreateParamsNonStreaming, "model">,
	): Promise<ChatResponse> {
		const fallbackModel = "gpt-4o-mini";
		console.warn(`[AzureOpenAI] ${this.model} rate-limited, falling back to ${fallbackModel}`);

		const fallbackClient = new OpenAI({
			apiKey: this.config.apiKey,
			baseURL: getAzureBaseURL(this.config.endpoint, fallbackModel),
			defaultQuery: getAzureDefaultQuery(this.config.endpoint, fallbackModel, this.config.apiVersion),
			defaultHeaders: { "api-key": this.config.apiKey },
		});

		const response = await fallbackClient.chat.completions.create({
			model: fallbackModel,
			...requestBase,
		});

		const choice = response.choices[0];
		return {
			content: choice?.message?.content ?? "",
			inputTokens: response.usage?.prompt_tokens ?? 0,
			outputTokens: response.usage?.completion_tokens ?? 0,
			model: `${fallbackModel} (fallback from ${this.model})`,
		};
	}
}

/** Check if an error is a 429 rate-limit error */
function isRateLimitError(err: unknown): boolean {
	if (err instanceof OpenAI.APIError) {
		return err.status === 429;
	}
	if (err instanceof Error && err.message.includes("429")) {
		return true;
	}
	return false;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
