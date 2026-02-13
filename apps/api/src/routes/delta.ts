/**
 * Delta Detection route — compare two spec versions.
 *
 * WF6: Spec Delta Detection.
 */

import { Router } from "express";
import { db } from "../db.js";
import { analyzeSpecDelta } from "../services/delta-detection.js";

export const deltaRouter = Router();

/**
 * POST /api/specs/:specId/delta
 * Body: { previousSpecId: string }
 * Compares two spec versions and returns impact analysis.
 */
deltaRouter.post("/:specId/delta", async (req, res) => {
	const { specId } = req.params;
	const { previousSpecId } = req.body as { previousSpecId: string };

	if (!previousSpecId) {
		res.status(400).json({ error: "previousSpecId is required" });
		return;
	}

	try {
		// Load both specs from Cosmos
		const [newSpecResult, oldSpecResult] = await Promise.all([
			db.specs.read(specId, specId),
			db.specs.read(previousSpecId, previousSpecId),
		]);

		if (!newSpecResult.ok) {
			res.status(404).json({ error: `New spec not found: ${specId}` });
			return;
		}
		if (!oldSpecResult.ok) {
			res.status(404).json({ error: `Previous spec not found: ${previousSpecId}` });
			return;
		}

		// Get existing tasks for impact mapping (from most recent plan)
		// For now, pass empty array — tasks will be mapped by criteria IDs
		const analysis = analyzeSpecDelta(oldSpecResult.value, newSpecResult.value, []);

		res.json(analysis);
	} catch (error) {
		console.error("[Delta] Analysis error:", error);
		res.status(500).json({ error: "Delta analysis failed" });
	}
});
