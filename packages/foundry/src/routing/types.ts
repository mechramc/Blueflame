/**
 * Routing types — shared interfaces for ACAR σ-routing.
 *
 * σ is a routing primitive that selects cost tier and provider.
 * It is NOT a quality score. No attribution (Di) is used.
 */

import type { AgentRole } from "@blueflame/shared";

/** Execution cost tier derived from σ value */
export enum ExecutionTier {
	Routine = "ROUTINE",
	Standard = "STANDARD",
	Complex = "COMPLEX",
}

/** Supported model providers */
export enum ProviderType {
	AzureOpenAI = "AZURE_OPENAI",
	Anthropic = "ANTHROPIC",
	Google = "GOOGLE",
	OpenAIDirect = "OPENAI_DIRECT",
}

/** Provider-specific configuration for a model endpoint */
export interface ProviderConfig {
	provider: ProviderType;
	model: string;
	endpoint: string;
	apiKey: string;
	apiVersion?: string;
}

/**
 * Routing decision — transparency log, NOT attribution.
 * Logged for cost auditing and debugging only.
 */
export interface RoutingDecision {
	role: AgentRole;
	sigma: number;
	tier: ExecutionTier;
	provider: ProviderType;
	model: string;
	reason: string;
	/** Full provider config for task execution (not serialized to audit log) */
	providerConfig?: ProviderConfig;
}

/** Chat message in provider-agnostic format */
export interface ChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

/** Options for a chat completion request */
export interface ChatOptions {
	temperature?: number;
	maxTokens?: number;
	stream?: boolean;
	/** Request JSON output mode from the model */
	responseFormat?: "json_object";
}

/** Unified chat response from any provider */
export interface ChatResponse {
	content: string;
	inputTokens: number;
	outputTokens: number;
	model: string;
}

/** Model router interface — ACAR is replaceable/optional */
export interface ModelRouter {
	route(role: AgentRole, sigma: number): RoutingDecision;
}

/** Unified model client interface */
export interface FoundryModelClient {
	chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
}

/** OpenAI-native models that use the /openai/deployments/ path + api-version */
const OPENAI_MODEL_PREFIXES = ["gpt-", "o1", "o3-", "dall-e", "text-", "whisper"];

/** Reasoning model prefixes that use max_completion_tokens instead of max_tokens */
const REASONING_MODEL_PREFIXES = ["o1", "o3-"];

/** Models that DON'T support response_format: { type: "json_object" } */
const NO_JSON_FORMAT_PREFIXES = REASONING_MODEL_PREFIXES;

/**
 * Check if a model supports response_format: { type: "json_object" }.
 * Catalog models (Phi-4, Llama) and reasoning models (o1, o3-mini) don't support it.
 * Only GPT models (gpt-4o, gpt-4o-mini) reliably support it.
 */
export function supportsJsonFormat(deployment: string): boolean {
	const lower = deployment.toLowerCase();
	// Reasoning models don't support response_format
	if (NO_JSON_FORMAT_PREFIXES.some((p) => lower.startsWith(p))) return false;
	// Only OpenAI GPT models support it — catalog models (Phi-4, Llama) don't
	return lower.startsWith("gpt-");
}

/**
 * Check if a model is a reasoning model (o1, o3-mini) that requires
 * max_completion_tokens instead of max_tokens.
 */
export function isReasoningModel(deployment: string): boolean {
	const lower = deployment.toLowerCase();
	return REASONING_MODEL_PREFIXES.some((p) => lower.startsWith(p));
}

/**
 * Returns the correct token limit parameter for a model.
 * Reasoning models (o1, o3-mini) use max_completion_tokens; others use max_tokens.
 */
export function getTokenParams(
	deployment: string,
	maxTokens: number,
): { max_tokens: number } | { max_completion_tokens: number } {
	if (isReasoningModel(deployment)) {
		return { max_completion_tokens: maxTokens };
	}
	return { max_tokens: maxTokens };
}

/**
 * Returns model-specific parameters, stripping unsupported ones.
 * Reasoning models (o1, o3-mini) don't support temperature or response_format.
 */
export function getModelParams(
	deployment: string,
	opts: { maxTokens: number; temperature?: number; jsonMode?: boolean },
): Record<string, unknown> {
	const reasoning = isReasoningModel(deployment);
	return {
		...(reasoning
			? { max_completion_tokens: opts.maxTokens }
			: { max_tokens: opts.maxTokens }),
		...(reasoning ? {} : { temperature: opts.temperature }),
		...(!reasoning && opts.jsonMode && supportsJsonFormat(deployment)
			? { response_format: { type: "json_object" as const } }
			: {}),
	};
}

/**
 * Check if a model is an OpenAI-native model (uses /openai/deployments/ path).
 */
export function isOpenAIModel(deployment: string): boolean {
	const lower = deployment.toLowerCase();
	return OPENAI_MODEL_PREFIXES.some((p) => lower.startsWith(p));
}

/** Default API versions per endpoint type */
export const OPENAI_API_VERSION = "2024-12-01-preview";
export const FOUNDRY_INFERENCE_API_VERSION = "2024-05-01-preview";

/**
 * Detect if the endpoint is Azure AI Foundry (.services.ai.azure.com)
 * vs classic Azure OpenAI (.openai.azure.com).
 *
 * AI Foundry uses /openai/v1/ for ALL models (including gpt-4o, o3-mini).
 * Classic Azure OpenAI uses /openai/deployments/{name} + api-version.
 */
function isFoundryEndpoint(endpoint: string): boolean {
	return endpoint.includes(".services.ai.azure.com");
}

/**
 * Returns the Azure base URL for a model deployment.
 *
 * AI Foundry: ALL models use {resource-endpoint}/openai/v1 (model in request body)
 * Classic Azure OpenAI: /openai/deployments/{deployment} for OpenAI models,
 *                       /openai/v1 for catalog models
 */
export function getAzureBaseURL(endpoint: string, deployment: string): string {
	// AI Foundry: everything goes through /openai/v1/
	if (isFoundryEndpoint(endpoint)) {
		const resourceEndpoint = endpoint.replace(/\/api\/projects\/[^/]+\/?$/, "");
		return `${resourceEndpoint}/openai/v1`;
	}

	// Classic Azure OpenAI
	if (isOpenAIModel(deployment)) {
		return `${endpoint}/openai/deployments/${deployment}`;
	}
	const resourceEndpoint = endpoint.replace(/\/api\/projects\/[^/]+\/?$/, "");
	return `${resourceEndpoint}/openai/v1`;
}

/**
 * Returns the correct defaultQuery for an Azure model deployment.
 *
 * AI Foundry: NO api-version needed (for any model)
 * Classic Azure OpenAI: OpenAI models need api-version; catalog models don't.
 */
export function getAzureDefaultQuery(
	endpoint: string,
	deployment: string,
	configVersion?: string,
): Record<string, string> {
	// AI Foundry doesn't use api-version
	if (isFoundryEndpoint(endpoint)) {
		return {};
	}

	// Classic Azure OpenAI
	if (isOpenAIModel(deployment)) {
		return { "api-version": configVersion ?? OPENAI_API_VERSION };
	}
	return {};
}
