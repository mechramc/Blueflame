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

	const claudeSonnet: ProviderConfig = {
		provider: ProviderType.Anthropic,
		model: "claude-sonnet-4-5",
		endpoint: "https://api.anthropic.com",
		apiKey: anthropicKey,
	};

	// Role-specific model routing — ACAR selects optimal model per role + tier
	// Builder: needs strongest code generation → 4o for standard, Claude for complex
	registry.set(registryKey(AgentRole.Builder, ExecutionTier.Routine), { ...azureMini });
	registry.set(registryKey(AgentRole.Builder, ExecutionTier.Standard), { ...azure4o });
	registry.set(registryKey(AgentRole.Builder, ExecutionTier.Complex), { ...claudeSonnet });

	// Verifier: code review is less token-intensive → mini for routine/standard, 4o for complex
	registry.set(registryKey(AgentRole.Verifier, ExecutionTier.Routine), { ...azureMini });
	registry.set(registryKey(AgentRole.Verifier, ExecutionTier.Standard), { ...azureMini });
	registry.set(registryKey(AgentRole.Verifier, ExecutionTier.Complex), { ...azure4o });

	// Fixer: same as Builder — needs strong code generation
	registry.set(registryKey(AgentRole.Fixer, ExecutionTier.Routine), { ...azureMini });
	registry.set(registryKey(AgentRole.Fixer, ExecutionTier.Standard), { ...azure4o });
	registry.set(registryKey(AgentRole.Fixer, ExecutionTier.Complex), { ...claudeSonnet });

	// Planner: task decomposition benefits from stronger reasoning at standard+
	registry.set(registryKey(AgentRole.Planner, ExecutionTier.Routine), { ...azureMini });
	registry.set(registryKey(AgentRole.Planner, ExecutionTier.Standard), { ...azure4o });
	registry.set(registryKey(AgentRole.Planner, ExecutionTier.Complex), { ...azure4o });

	// Explainer: lightweight summarization → mini for all tiers
	registry.set(registryKey(AgentRole.Explainer, ExecutionTier.Routine), { ...azureMini });
	registry.set(registryKey(AgentRole.Explainer, ExecutionTier.Standard), { ...azureMini });
	registry.set(registryKey(AgentRole.Explainer, ExecutionTier.Complex), { ...azure4o });
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
