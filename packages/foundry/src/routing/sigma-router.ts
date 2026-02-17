/**
 * Sigma Router — σ→tier→provider routing.
 *
 * σ is a routing primitive, not a quality score.
 * It selects execution cost tier; the registry resolves to a provider+model.
 */

import type { AgentRole } from "@blueflame/shared";

import { getProviderConfig } from "./model-registry.js";
import { ExecutionTier, type ModelRouter, type RoutingDecision } from "./types.js";

/**
 * Map σ value to execution tier.
 * σ < 0.4  → Routine  (cheap, fast models — gpt-4o-mini)
 * 0.4 ≤ σ ≤ 0.6 → Standard (balanced — gpt-4o)
 * σ > 0.6  → Complex  (most capable — gpt-4o / claude-sonnet)
 */
export function sigmaToTier(sigma: number): ExecutionTier {
	// Clamp to [0, 1]
	const clamped = Math.max(0, Math.min(1, sigma));

	if (clamped < 0.4) return ExecutionTier.Routine;
	if (clamped > 0.6) return ExecutionTier.Complex;
	return ExecutionTier.Standard;
}

/**
 * SigmaRouter — implements ModelRouter interface.
 * Routes agent role + σ estimate to a specific provider+model.
 */
export class SigmaRouter implements ModelRouter {
	route(role: AgentRole, sigma: number): RoutingDecision {
		const clamped = Math.max(0, Math.min(1, sigma));
		const tier = sigmaToTier(clamped);
		const config = getProviderConfig(role, tier);

		return {
			role,
			sigma: clamped,
			tier,
			provider: config.provider,
			model: config.model,
			reason: `σ=${clamped.toFixed(2)} → ${tier} tier`,
			providerConfig: config,
		};
	}
}
