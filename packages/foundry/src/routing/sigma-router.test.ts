import { AgentRole } from "@blueflame/shared";
import { describe, expect, it } from "vitest";

import { resetRegistry, setProviderConfig } from "./model-registry.js";
import { SigmaRouter, sigmaToTier } from "./sigma-router.js";
import { ExecutionTier, ProviderType } from "./types.js";

describe("sigmaToTier", () => {
	it("should return Routine for σ=0", () => {
		expect(sigmaToTier(0)).toBe(ExecutionTier.Routine);
	});

	it("should return Routine for σ=0.29", () => {
		expect(sigmaToTier(0.29)).toBe(ExecutionTier.Routine);
	});

	it("should return Standard for σ=0.3", () => {
		expect(sigmaToTier(0.3)).toBe(ExecutionTier.Standard);
	});

	it("should return Standard for σ=0.5", () => {
		expect(sigmaToTier(0.5)).toBe(ExecutionTier.Standard);
	});

	it("should return Standard for σ=0.7", () => {
		expect(sigmaToTier(0.7)).toBe(ExecutionTier.Standard);
	});

	it("should return Complex for σ=0.71", () => {
		expect(sigmaToTier(0.71)).toBe(ExecutionTier.Complex);
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

	it("should route low σ to Routine tier with gpt-4o-mini", () => {
		const decision = router.route(AgentRole.Builder, 0.1);
		expect(decision.tier).toBe(ExecutionTier.Routine);
		expect(decision.model).toBe("gpt-4o-mini");
		expect(decision.provider).toBe(ProviderType.AzureOpenAI);
	});

	it("should route medium σ to Standard tier with gpt-4o", () => {
		const decision = router.route(AgentRole.Builder, 0.5);
		expect(decision.tier).toBe(ExecutionTier.Standard);
		expect(decision.model).toBe("gpt-4o");
		expect(decision.provider).toBe(ProviderType.AzureOpenAI);
	});

	it("should route high σ Builder to Complex tier with claude-sonnet-4-5", () => {
		resetRegistry();
		const decision = router.route(AgentRole.Builder, 0.8);
		expect(decision.tier).toBe(ExecutionTier.Complex);
		expect(decision.model).toBe("claude-sonnet-4-5");
		expect(decision.provider).toBe(ProviderType.Anthropic);
	});

	it("should route high σ Verifier to Complex tier with gpt-4o", () => {
		resetRegistry();
		const decision = router.route(AgentRole.Verifier, 0.8);
		expect(decision.tier).toBe(ExecutionTier.Complex);
		expect(decision.model).toBe("gpt-4o");
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
		setProviderConfig(AgentRole.Explainer, ExecutionTier.Standard, {
			provider: ProviderType.Google,
			model: "gemini-2.5-pro",
			endpoint: "https://generativelanguage.googleapis.com",
			apiKey: "test-key",
		});

		const decision = router.route(AgentRole.Explainer, 0.5);
		expect(decision.model).toBe("gemini-2.5-pro");
		expect(decision.provider).toBe(ProviderType.Google);

		// Cleanup
		resetRegistry();
	});
});
