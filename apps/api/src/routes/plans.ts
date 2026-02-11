/**
 * Plans route — generate task plan from frozen spec, retrieve plans
 */

import type { PlannerConfig, RawPlanOutput } from "@blueflame/foundry";
import { generatePlan } from "@blueflame/foundry";
import { Router } from "express";
import { getSpec } from "../services/spec-generation.js";
import { createPlanFromRaw, getPlanByRunId } from "../services/planning.js";

const router = Router();

function getPlannerConfig(): PlannerConfig {
	return {
		endpoint: process.env.FOUNDRY_ENDPOINT ?? process.env.AZURE_OPENAI_ENDPOINT ?? "",
		apiKey: process.env.FOUNDRY_API_KEY ?? process.env.AZURE_OPENAI_API_KEY ?? "",
		deployment:
			process.env.FOUNDRY_PLANNER_DEPLOYMENT ?? process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o",
		apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21",
	};
}

/**
 * POST /api/plans/generate
 * Body: { specId: string, runId: string, projectId: string }
 * Generates a task plan from a frozen spec via the Planner agent.
 */
router.post("/generate", async (req, res) => {
	const { specId, runId, projectId } = req.body as {
		specId: string;
		runId: string;
		projectId: string;
	};

	if (!specId || !runId || !projectId) {
		res.status(400).json({ error: "specId, runId, and projectId are required" });
		return;
	}

	const spec = getSpec(specId);
	if (!spec) {
		res.status(404).json({ error: `Spec not found: ${specId}` });
		return;
	}

	try {
		const config = getPlannerConfig();
		const rawPlan: RawPlanOutput = await generatePlan(config, spec.content);
		const result = createPlanFromRaw(specId, runId, projectId, rawPlan);

		if (!result.ok) {
			res.status(409).json({ error: result.error.message });
			return;
		}

		res.json({ plan: result.value });
	} catch (error) {
		console.error("[Plans] Generation error:", error);
		res.status(500).json({ error: "Plan generation failed" });
	}
});

/**
 * GET /api/plans/:runId
 * Returns the latest plan for a run.
 */
router.get("/:runId", (req, res) => {
	const plan = getPlanByRunId(req.params.runId);
	if (!plan) {
		res.status(404).json({ error: "No plan found for this run" });
		return;
	}
	res.json({ plan });
});

export const plansRouter = router;
