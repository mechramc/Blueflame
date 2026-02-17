/**
 * Model Registry — configurable (role, tier) → provider+model mapping.
 *
 * Defaults are sensible for Azure OpenAI + multi-provider routing.
 * Override via env vars: SIGMA_ROUTER_<ROLE>_<TIER>_MODEL (e.g., SIGMA_ROUTER_BUILDER_COMPLEX_MODEL)
 * or at runtime via setProviderConfig().
 */

import { AgentRole } from "@blueflame/shared";

import { ExecutionTier, type ProviderConfig, ProviderType } from "./types.js";

/** Registry key combining role and tier */
function registryKey(role: AgentRole, tier: ExecutionTier): string {
	return `${role}:${tier}`;
}

/** Default provider configs per (role, tier) */
const registry = new Map<string, ProviderConfig>();

/** Build the default registry */
function initDefaults(): void {
	const azureEndpoint = process.env.FOUNDRY_ENDPOINT ?? process.env.AZURE_OPENAI_ENDPOINT ?? "";
	const azureKey = process.env.FOUNDRY_API_KEY ?? process.env.AZURE_OPENAI_API_KEY ?? "";
	const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";

	// If FOUNDRY_DEPLOYMENT is set, use it for all Azure tiers (single-deployment setup)
	const foundryDeployment = process.env.FOUNDRY_DEPLOYMENT;

	const azureMini: ProviderConfig = {
		provider: ProviderType.AzureOpenAI,
		model: foundryDeployment ?? "gpt-4o-mini",
		endpoint: azureEndpoint,
		apiKey: azureKey,
		apiVersion: "2024-10-21",
	};

	const azure4o: ProviderConfig = {
		provider: ProviderType.AzureOpenAI,
		model: foundryDeployment ?? "gpt-4o",
		endpoint: azureEndpoint,
		apiKey: azureKey,
		apiVersion: "2024-10-21",
	};

	const phi4: ProviderConfig = {
		provider: ProviderType.AzureOpenAI,
		model: foundryDeployment ?? "Phi-4",
		endpoint: azureEndpoint,
		apiKey: azureKey,
		apiVersion: "2024-10-21",
	};

	const llama33: ProviderConfig = {
		provider: ProviderType.AzureOpenAI,
		model: foundryDeployment ?? "Llama-3.3-70B-Instruct",
		endpoint: azureEndpoint,
		apiKey: azureKey,
		apiVersion: "2024-10-21",
	};

	const o3Mini: ProviderConfig = {
		provider: ProviderType.AzureOpenAI,
		model: foundryDeployment ?? "o3-mini",
		endpoint: azureEndpoint,
		apiKey: azureKey,
		apiVersion: "2024-10-21",
	};

	const claudeSonnet: ProviderConfig = {
		provider: ProviderType.Anthropic,
		model: "claude-sonnet-4-5",
		endpoint: "https://api.anthropic.com",
		apiKey: anthropicKey,
	};

	// Complex tier for code generation: Claude if available, else gpt-4o
	const complexCodeGen = anthropicKey ? { ...claudeSonnet } : { ...azure4o };

	// Role-specific model routing — ACAR selects optimal model per role + tier
	// 8 models across 5 providers: Phi-4 (nano), gpt-4o-mini (routine), Llama 3.3 70B (standard),
	// gpt-4o (standard+), Claude Sonnet (complex code), o3-mini (complex reasoning)

	// Builder: code generation — Phi-4 for trivial, Llama 3.3 for standard, Claude/4o for complex
	registry.set(registryKey(AgentRole.Builder, ExecutionTier.Routine), { ...phi4 });
	registry.set(registryKey(AgentRole.Builder, ExecutionTier.Standard), { ...llama33 });
	registry.set(registryKey(AgentRole.Builder, ExecutionTier.Complex), complexCodeGen);

	// Verifier: code review — Phi-4 for routine, gpt-4o-mini for standard, o3-mini for complex (reasoning)
	registry.set(registryKey(AgentRole.Verifier, ExecutionTier.Routine), { ...phi4 });
	registry.set(registryKey(AgentRole.Verifier, ExecutionTier.Standard), { ...azureMini });
	registry.set(registryKey(AgentRole.Verifier, ExecutionTier.Complex), { ...o3Mini });

	// Fixer: same as Builder — needs strong code generation
	registry.set(registryKey(AgentRole.Fixer, ExecutionTier.Routine), { ...phi4 });
	registry.set(registryKey(AgentRole.Fixer, ExecutionTier.Standard), { ...llama33 });
	registry.set(registryKey(AgentRole.Fixer, ExecutionTier.Complex), complexCodeGen);

	// Planner: task decomposition — Phi-4 for routine, gpt-4o for standard, o3-mini for complex (reasoning)
	registry.set(registryKey(AgentRole.Planner, ExecutionTier.Routine), { ...phi4 });
	registry.set(registryKey(AgentRole.Planner, ExecutionTier.Standard), { ...azure4o });
	registry.set(registryKey(AgentRole.Planner, ExecutionTier.Complex), { ...o3Mini });

	// Explainer: lightweight summarization — Phi-4 for routine/standard, gpt-4o-mini for complex
	registry.set(registryKey(AgentRole.Explainer, ExecutionTier.Routine), { ...phi4 });
	registry.set(registryKey(AgentRole.Explainer, ExecutionTier.Standard), { ...phi4 });
	registry.set(registryKey(AgentRole.Explainer, ExecutionTier.Complex), { ...azureMini });
}

// Initialize on module load
initDefaults();

/**
 * Apply environment variable overrides.
 * Format: SIGMA_ROUTER_<ROLE>_<TIER>_MODEL=<model>
 * Format: SIGMA_ROUTER_<ROLE>_<TIER>_PROVIDER=<provider>
 */
function applyEnvOverrides(role: AgentRole, tier: ExecutionTier): ProviderConfig | undefined {
	const roleKey = role.toUpperCase();
	const tierKey = tier.toUpperCase();
	const modelEnv = process.env[`SIGMA_ROUTER_${roleKey}_${tierKey}_MODEL`];
	const providerEnv = process.env[`SIGMA_ROUTER_${roleKey}_${tierKey}_PROVIDER`];

	if (!modelEnv) return undefined;

	const existing = registry.get(registryKey(role, tier));
	if (!existing) return undefined;

	const overridden = { ...existing, model: modelEnv };
	if (providerEnv) {
		const providerMap: Record<string, ProviderType> = {
			AZURE_OPENAI: ProviderType.AzureOpenAI,
			ANTHROPIC: ProviderType.Anthropic,
			GOOGLE: ProviderType.Google,
			OPENAI_DIRECT: ProviderType.OpenAIDirect,
		};
		const mapped = providerMap[providerEnv.toUpperCase()];
		if (mapped) overridden.provider = mapped;
	}

	return overridden;
}

/**
 * Get provider config for a (role, tier) combination.
 * Checks env overrides first, then registry, then falls back to Standard tier.
 */
export function getProviderConfig(role: AgentRole, tier: ExecutionTier): ProviderConfig {
	// Check env override first
	const envOverride = applyEnvOverrides(role, tier);
	if (envOverride) return envOverride;

	// Check registry
	const config = registry.get(registryKey(role, tier));
	if (config) return config;

	// Fallback to Standard tier for the same role
	const fallback = registry.get(registryKey(role, ExecutionTier.Standard));
	if (fallback) return fallback;

	// Ultimate fallback: gpt-4o on Azure
	return {
		provider: ProviderType.AzureOpenAI,
		model: process.env.FOUNDRY_DEPLOYMENT ?? "gpt-4o",
		endpoint: process.env.FOUNDRY_ENDPOINT ?? process.env.AZURE_OPENAI_ENDPOINT ?? "",
		apiKey: process.env.FOUNDRY_API_KEY ?? process.env.AZURE_OPENAI_API_KEY ?? "",
		apiVersion: "2024-10-21",
	};
}

/**
 * Override provider config at runtime (e.g., for testing or dynamic reconfiguration).
 */
export function setProviderConfig(
	role: AgentRole,
	tier: ExecutionTier,
	config: ProviderConfig,
): void {
	registry.set(registryKey(role, tier), config);
}

/**
 * Reset registry to defaults (for testing).
 */
export function resetRegistry(): void {
	registry.clear();
	initDefaults();
}
