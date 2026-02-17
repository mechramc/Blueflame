import { AgentRole } from "@blueflame/shared";
import { describe, expect, it } from "vitest";

import { resetRegistry, setProviderConfig } from "./model-registry.js";
import { SigmaRouter, sigmaToTier } from "./sigma-router.js";
import { ExecutionTier, ProviderType } from "./types.js";

describe("sigmaToTier", () => {
	it("should return Routine for σ=0", () => {
		expect(sigmaToTier(0)).toBe(ExecutionTier.Routine);
	});

	it("should return Routine for σ=0.39", () => {
		expect(sigmaToTier(0.39)).toBe(ExecutionTier.Routine);
	});

	it("should return Standard for σ=0.4", () => {
		expect(sigmaToTier(0.4)).toBe(ExecutionTier.Standard);
	});

	it("should return Standard for σ=0.5", () => {
		expect(sigmaToTier(0.5)).toBe(ExecutionTier.Standard);
	});

	it("should return Standard for σ=0.6", () => {
		expect(sigmaToTier(0.6)).toBe(ExecutionTier.Standard);
	});

	it("should return Complex for σ=0.61", () => {
		expect(sigmaToTier(0.61)).toBe(ExecutionTier.Complex);
	});

	it("should return Complex for σ=1.0", () => {
		expect(sigmaToTier(1.0)).toBe(ExecutionTier.Complex);
	});

	it("should clamp negative σ to Routine", () => {
		expect(sigmaToTier(-0.5)).toBe(ExecutionTier.Routine);
	});

	it("should clamp σ>1 to Complex", () => {
		expect(sigmaToTier(1.5)).toBe(ExecutionTier.Complex);
	});
});

describe("SigmaRouter.route", () => {
	const router = new SigmaRouter();

	it("should route low σ to Routine tier with Phi-4", () => {
		const decision = router.route(AgentRole.Builder, 0.1);
		expect(decision.tier).toBe(ExecutionTier.Routine);
		expect(decision.model).toBe("Phi-4");
		expect(decision.provider).toBe(ProviderType.AzureOpenAI);
	});

	it("should route medium σ to Standard tier with Llama-3.3-70B-Instruct", () => {
		const decision = router.route(AgentRole.Builder, 0.5);
		expect(decision.tier).toBe(ExecutionTier.Standard);
		expect(decision.model).toBe("Llama-3.3-70B-Instruct");
		expect(decision.provider).toBe(ProviderType.AzureOpenAI);
	});

	it("should route high σ Builder to Complex tier", () => {
		resetRegistry();
		const decision = router.route(AgentRole.Builder, 0.8);
		expect(decision.tier).toBe(ExecutionTier.Complex);
		// Without ANTHROPIC_API_KEY, falls back to gpt-4o; with it, uses claude-sonnet-4-5
		const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
		expect(decision.model).toBe(hasAnthropic ? "claude-sonnet-4-5" : "gpt-4o");
	});

	it("should route high σ Verifier to Complex tier with o3-mini", () => {
		resetRegistry();
		const decision = router.route(AgentRole.Verifier, 0.8);
		expect(decision.tier).toBe(ExecutionTier.Complex);
		expect(decision.model).toBe("o3-mini");
	});

	it("should route medium σ Verifier to Standard tier with gpt-4o-mini", () => {
		resetRegistry();
		const decision = router.route(AgentRole.Verifier, 0.5);
		expect(decision.tier).toBe(ExecutionTier.Standard);
		expect(decision.model).toBe("gpt-4o-mini");
	});

	it("should route Explainer to Phi-4 at Standard tier", () => {
		resetRegistry();
		const decision = router.route(AgentRole.Explainer, 0.5);
		expect(decision.tier).toBe(ExecutionTier.Standard);
		expect(decision.model).toBe("Phi-4");
	});

	it("should include providerConfig in routing decision", () => {
		resetRegistry();
		const decision = router.route(AgentRole.Builder, 0.5);
		expect(decision.providerConfig).toBeDefined();
		expect(decision.providerConfig?.model).toBe("Llama-3.3-70B-Instruct");
	});

	it("should clamp negative σ values", () => {
		const decision = router.route(AgentRole.Planner, -0.5);
		expect(decision.sigma).toBe(0);
		expect(decision.tier).toBe(ExecutionTier.Routine);
	});

	it("should clamp σ>1 values", () => {
		const decision = router.route(AgentRole.Planner, 2.0);
		expect(decision.sigma).toBe(1);
		expect(decision.tier).toBe(ExecutionTier.Complex);
	});

	it("should include reason string with σ value", () => {
		const decision = router.route(AgentRole.Builder, 0.15);
		expect(decision.reason).toContain("σ=0.15");
		expect(decision.reason).toContain("ROUTINE");
	});

	it("should include role in decision", () => {
		const decision = router.route(AgentRole.Fixer, 0.5);
		expect(decision.role).toBe(AgentRole.Fixer);
	});

	it("should respect runtime overrides via setProviderConfig", () => {
		setProviderConfig(AgentRole.Builder, ExecutionTier.Standard, {
			provider: ProviderType.Google,
			model: "gemini-2.5-pro",
			endpoint: "https://generativelanguage.googleapis.com",
			apiKey: "test-key",
		});

		const decision = router.route(AgentRole.Builder, 0.5);
		expect(decision.model).toBe("gemini-2.5-pro");
		expect(decision.provider).toBe(ProviderType.Google);

		// Cleanup
		resetRegistry();
	});
});
