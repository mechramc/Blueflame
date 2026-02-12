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
 * σ < 0.3  → Routine  (cheap, fast models)
 * 0.3 ≤ σ ≤ 0.7 → Standard (balanced)
 * σ > 0.7  → Complex  (most capable models)
 */
export function sigmaToTier(sigma: number): ExecutionTier {
	// Clamp to [0, 1]
	const clamped = Math.max(0, Math.min(1, sigma));

	if (clamped < 0.3) return ExecutionTier.Routine;
	if (clamped > 0.7) return ExecutionTier.Complex;
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
		};
	}
}
