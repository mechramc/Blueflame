import { AgentRole } from "@blueflame/shared";
import { afterEach, describe, expect, it } from "vitest";

import { getProviderConfig, resetRegistry, setProviderConfig } from "./model-registry.js";
import { ExecutionTier, ProviderType } from "./types.js";

afterEach(() => {
	resetRegistry();
});

describe("getProviderConfig defaults", () => {
	it("should return Phi-4 for Builder Routine tier", () => {
		const config = getProviderConfig(AgentRole.Builder, ExecutionTier.Routine);
		expect(config.model).toBe("Phi-4");
		expect(config.provider).toBe(ProviderType.AzureOpenAI);
	});

	it("should return Llama-3.3-70B-Instruct for Builder Standard tier", () => {
		const config = getProviderConfig(AgentRole.Builder, ExecutionTier.Standard);
		expect(config.model).toBe("Llama-3.3-70B-Instruct");
		expect(config.provider).toBe(ProviderType.AzureOpenAI);
	});

	it("should return claude or gpt-4o for Builder Complex tier", () => {
		const config = getProviderConfig(AgentRole.Builder, ExecutionTier.Complex);
		const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
		if (hasAnthropic) {
			expect(config.model).toBe("claude-sonnet-4-5");
			expect(config.provider).toBe(ProviderType.Anthropic);
		} else {
			expect(config.model).toBe("gpt-4o");
			expect(config.provider).toBe(ProviderType.AzureOpenAI);
		}
	});

	it("should return o3-mini for Verifier Complex tier", () => {
		const config = getProviderConfig(AgentRole.Verifier, ExecutionTier.Complex);
		expect(config.model).toBe("o3-mini");
		expect(config.provider).toBe(ProviderType.AzureOpenAI);
	});

	it("should return config for all 5 roles at all 3 tiers", () => {
		const roles = [
			AgentRole.Planner,
			AgentRole.Builder,
			AgentRole.Verifier,
			AgentRole.Explainer,
			AgentRole.Fixer,
		];
		const tiers = [ExecutionTier.Routine, ExecutionTier.Standard, ExecutionTier.Complex];

		for (const role of roles) {
			for (const tier of tiers) {
				const config = getProviderConfig(role, tier);
				expect(config.model).toBeTruthy();
				expect(config.provider).toBeTruthy();
			}
		}
	});
});

describe("setProviderConfig", () => {
	it("should override config for a specific role+tier", () => {
		setProviderConfig(AgentRole.Planner, ExecutionTier.Complex, {
			provider: ProviderType.Google,
			model: "gemini-2.5-pro",
			endpoint: "https://generativelanguage.googleapis.com",
			apiKey: "test-key",
		});

		const config = getProviderConfig(AgentRole.Planner, ExecutionTier.Complex);
		expect(config.model).toBe("gemini-2.5-pro");
		expect(config.provider).toBe(ProviderType.Google);
	});

	it("should not affect other role+tier combinations", () => {
		setProviderConfig(AgentRole.Planner, ExecutionTier.Complex, {
			provider: ProviderType.Google,
			model: "gemini-2.5-pro",
			endpoint: "https://generativelanguage.googleapis.com",
			apiKey: "test-key",
		});

		const standard = getProviderConfig(AgentRole.Planner, ExecutionTier.Standard);
		expect(standard.model).toBe("gpt-4o");
	});
});

describe("resetRegistry", () => {
	it("should restore defaults after override", () => {
		setProviderConfig(AgentRole.Builder, ExecutionTier.Standard, {
			provider: ProviderType.OpenAIDirect,
			model: "o1",
			endpoint: "https://api.openai.com",
			apiKey: "test-key",
		});

		resetRegistry();

		const config = getProviderConfig(AgentRole.Builder, ExecutionTier.Standard);
		expect(config.model).toBe("Llama-3.3-70B-Instruct");
		expect(config.provider).toBe(ProviderType.AzureOpenAI);
	});
});
