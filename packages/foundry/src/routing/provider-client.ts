/**
 * Provider client factory — dispatches to provider-specific implementations.
 */

import { AnthropicClient } from "./providers/anthropic.js";
import { AzureOpenAIClient } from "./providers/azure-openai.js";
import { GoogleClient } from "./providers/google.js";
import { OpenAIDirectClient } from "./providers/openai-direct.js";
import { type FoundryModelClient, type ProviderConfig, ProviderType } from "./types.js";

/**
 * Create a model client for the given provider config.
 */
export function createModelClient(config: ProviderConfig): FoundryModelClient {
	switch (config.provider) {
		case ProviderType.AzureOpenAI:
			return new AzureOpenAIClient(config);
		case ProviderType.Anthropic:
			return new AnthropicClient(config);
		case ProviderType.Google:
			return new GoogleClient(config);
		case ProviderType.OpenAIDirect:
			return new OpenAIDirectClient(config);
		default: {
			const _exhaustive: never = config.provider;
			throw new Error(`Unknown provider: ${_exhaustive}`);
		}
	}
}
