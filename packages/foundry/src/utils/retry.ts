/**
 * Retry with exponential backoff + model fallback for Azure OpenAI API calls.
 *
 * Handles 429 rate-limit errors from catalog models (Phi-4, Llama) on S0 tier
 * by retrying with backoff, then falling back to gpt-4o-mini.
 */

import type OpenAI from "openai";
import { getAzureBaseURL, getAzureDefaultQuery, isOpenAIModel } from "../routing/types.js";

/** Max retry attempts before falling back */
const MAX_RETRIES = 2;

/** Base delay in ms for exponential backoff */
const BASE_DELAY_MS = 2000;

/** Fallback model when catalog models are rate-limited */
const FALLBACK_MODEL = "gpt-4o-mini";

interface RetryableCallConfig {
	/** The OpenAI client (primary model) */
	client: OpenAI;
	/** Model/deployment name */
	model: string;
	/** API key for fallback client */
	apiKey: string;
	/** Endpoint for fallback client */
	endpoint: string;
	/** API version for fallback client */
	apiVersion?: string;
}

/**
 * Execute a chat completion with retry + fallback.
 *
 * On 429 from catalog models (Phi-4, Llama), retries with exponential backoff
 * then falls back to gpt-4o-mini. OpenAI-native models (gpt-4o, o3-mini) only retry.
 */
export async function chatWithRetry(
	config: RetryableCallConfig,
	params: OpenAI.ChatCompletionCreateParamsNonStreaming,
): Promise<OpenAI.ChatCompletion> {
	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			return await config.client.chat.completions.create(params);
		} catch (err: unknown) {
			if (isRateLimitError(err) && attempt < MAX_RETRIES) {
				const delay = BASE_DELAY_MS * 2 ** attempt;
				console.warn(
					`[Retry] 429 on ${config.model} (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms...`,
				);
				await sleep(delay);
				continue;
			}

			// After all retries, fall back to gpt-4o-mini for catalog models
			if (isRateLimitError(err) && !isOpenAIModel(config.model)) {
				console.warn(
					`[Retry] ${config.model} rate-limited after ${MAX_RETRIES + 1} attempts, falling back to ${FALLBACK_MODEL}`,
				);
				return await callFallbackModel(config, params);
			}

			throw err;
		}
	}

	// Unreachable
	throw new Error(`[Retry] Exhausted retries for ${config.model}`);
}

/** Create a new client for gpt-4o-mini and execute the same request */
async function callFallbackModel(
	config: RetryableCallConfig,
	params: OpenAI.ChatCompletionCreateParamsNonStreaming,
): Promise<OpenAI.ChatCompletion> {
	// Dynamic import to avoid circular deps — OpenAI constructor
	const { default: OpenAIClient } = await import("openai");

	const fallbackClient = new OpenAIClient({
		apiKey: config.apiKey,
		baseURL: getAzureBaseURL(config.endpoint, FALLBACK_MODEL),
		defaultQuery: getAzureDefaultQuery(config.endpoint, FALLBACK_MODEL, config.apiVersion),
		defaultHeaders: { "api-key": config.apiKey },
	});

	return await fallbackClient.chat.completions.create({
		...params,
		model: FALLBACK_MODEL,
	});
}

function isRateLimitError(err: unknown): boolean {
	// OpenAI SDK APIError with status 429
	if (typeof err === "object" && err !== null && "status" in err) {
		return (err as { status: number }).status === 429;
	}
	if (err instanceof Error && err.message.includes("429")) {
		return true;
	}
	return false;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
