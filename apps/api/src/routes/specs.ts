/**
 * Specs route — generate, get, accept, freeze
 */

import type { SpecGeneratorConfig } from "@blueflame/foundry";
import { generateSpec } from "@blueflame/foundry";
import { Router } from "express";
import { getHistory } from "../services/conversation.js";
import { freezeSpec } from "../services/spec-freeze.js";
import { acceptSpec, createSpecFromYaml, getLatestSpec } from "../services/spec-generation.js";
import { validateSpec } from "../services/spec-validation.js";

const router = Router();

function getSpecGenConfig(): SpecGeneratorConfig {
	return {
		endpoint: process.env.FOUNDRY_ENDPOINT ?? process.env.AZURE_OPENAI_ENDPOINT ?? "",
		apiKey: process.env.FOUNDRY_API_KEY ?? process.env.AZURE_OPENAI_API_KEY ?? "",
		deployment:
			process.env.FOUNDRY_SPEC_DEPLOYMENT ?? process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o",
		apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-12-01-preview",
	};
}

/**
 * POST /api/specs/generate
 * Body: { projectId: string }
 * Generates a spec from the conversation history.
 */
router.post("/generate", async (req, res) => {
	const { projectId } = req.body as { projectId: string };

	if (!projectId) {
		res.status(400).json({ error: "projectId is required" });
		return;
	}

	const history = await getHistory(projectId);
	if (history.length === 0) {
		res.status(400).json({ error: "No conversation history found for this project" });
		return;
	}

	try {
		const config = getSpecGenConfig();
		const yamlContent = await generateSpec(config, history);
		const spec = await createSpecFromYaml(projectId, yamlContent, "system");
		res.json({ spec });
	} catch (error) {
		console.error("[Specs] Generation error:", error);
		res.status(500).json({ error: "Spec generation failed" });
	}
});

/**
 * GET /api/specs/:projectId
 * Returns the latest spec for a project.
 */
router.get("/:projectId", async (req, res) => {
	const spec = await getLatestSpec(req.params.projectId);
	if (!spec) {
		res.status(404).json({ error: "No spec found for this project" });
		return;
	}
	res.json({ spec });
});

/**
 * PUT /api/specs/:specId/accept
 * Transitions a spec from DRAFT → ACCEPTED.
 */
router.put("/:specId/accept", async (req, res) => {
	const spec = await acceptSpec(req.params.specId);
	if (!spec) {
		res.status(409).json({ error: "Spec cannot be accepted (not in DRAFT status or not found)" });
		return;
	}
	res.json({ spec });
});

/**
 * PUT /api/specs/:specId/freeze
 * Freezes an ACCEPTED spec: computes SHA-256 hash, sets FROZEN, increments version.
 */
router.put("/:specId/freeze", async (req, res) => {
	const result = await freezeSpec(req.params.specId);
	if (!result.ok) {
		res.status(409).json({ error: result.error.message });
		return;
	}
	res.json({ spec: result.value });
});

/**
 * POST /api/specs/:specId/validate
 * Validates spec content: schema, policy, budget estimate.
 * Body: { content: string }
 */
router.post("/:specId/validate", (req, res) => {
	const { content } = req.body as { content: string };

	if (!content) {
		res.status(400).json({ error: "content is required" });
		return;
	}

	const result = validateSpec(content);
	res.json(result);
});

export const specsRouter = router;
