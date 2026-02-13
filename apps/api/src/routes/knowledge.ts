/**
 * Knowledge routes — WF7 Organizational Learning.
 *
 * Provides API access to learned patterns from project execution.
 */

import type { PatternSource } from "@blueflame/shared";
import { Router } from "express";
import {
	findSimilarPatterns,
	getPatternsByProject,
	getTopPatterns,
	recordPattern,
} from "../services/knowledge-store.js";

export const knowledgeRouter = Router();

/**
 * GET /api/knowledge/patterns
 * Query params: ?projectId=xxx or ?limit=20
 * Returns top patterns, optionally filtered by project.
 */
knowledgeRouter.get("/patterns", async (req, res) => {
	const { projectId, limit } = req.query as { projectId?: string; limit?: string };

	try {
		const maxResults = Math.min(Number.parseInt(limit ?? "20", 10), 100);

		if (projectId) {
			const patterns = await getPatternsByProject(projectId);
			res.json({ patterns, total: patterns.length });
			return;
		}

		const patterns = await getTopPatterns(maxResults);
		res.json({ patterns, total: patterns.length });
	} catch (error) {
		console.error("[Knowledge] Query error:", error);
		res.status(500).json({ error: "Failed to query patterns" });
	}
});

/**
 * POST /api/knowledge/patterns
 * Body: { pattern, context, resolution, projectId, source }
 * Manually record a pattern.
 */
knowledgeRouter.post("/patterns", async (req, res) => {
	const { pattern, context, resolution, projectId, source } = req.body as {
		pattern?: string;
		context?: string;
		resolution?: string;
		projectId?: string;
		source?: PatternSource;
	};

	if (!pattern || !context || !resolution || !projectId) {
		res.status(400).json({ error: "pattern, context, resolution, and projectId are required" });
		return;
	}

	try {
		const entry = await recordPattern({
			pattern,
			context,
			resolution,
			projectId,
			source: source ?? "manual",
		});
		res.status(201).json(entry);
	} catch (error) {
		console.error("[Knowledge] Record error:", error);
		res.status(500).json({ error: "Failed to record pattern" });
	}
});

/**
 * POST /api/knowledge/search
 * Body: { query, limit }
 * Search for similar patterns by context.
 */
knowledgeRouter.post("/search", async (req, res) => {
	const { query, limit } = req.body as { query?: string; limit?: number };

	if (!query) {
		res.status(400).json({ error: "query is required" });
		return;
	}

	try {
		const patterns = await findSimilarPatterns(query, Math.min(limit ?? 10, 50));
		res.json({ patterns, total: patterns.length });
	} catch (error) {
		console.error("[Knowledge] Search error:", error);
		res.status(500).json({ error: "Failed to search patterns" });
	}
});
