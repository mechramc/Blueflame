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

/**
 * Returns the Azure base URL for a model deployment.
 *
 * Azure AI Foundry uses /openai/deployments/{deployment} for ALL models
 * deployed in the resource, including catalog models (Phi-4, Llama, etc.).
 */
export function getAzureBaseURL(endpoint: string, deployment: string): string {
	return `${endpoint}/openai/deployments/${deployment}`;
}
