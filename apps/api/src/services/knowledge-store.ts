/**
 * Knowledge Store — WF7 Organizational Learning.
 *
 * Stores and retrieves learned patterns from project execution.
 * Patterns are extracted from completed runs (successes and failures)
 * and stored in Cosmos DB for cross-project knowledge sharing.
 *
 * Uses text-based similarity matching for pattern lookup.
 * Future: integrate @blueflame/foundry embeddings for semantic search.
 */

import type { PatternEntry, PatternSource, UploadedDocument } from "@blueflame/shared";
import { db } from "../db.js";

const DOC_TYPE = "pattern";

/** In-memory cache for fast lookups during session */
const patternCache = new Map<string, PatternEntry>();
let cacheLoaded = false;

/**
 * Load patterns from Cosmos into memory cache (idempotent).
 */
async function ensureCacheLoaded(): Promise<void> {
	if (cacheLoaded) return;

	try {
		const docs = await db.documents.findByType("global", DOC_TYPE);
		for (const doc of docs) {
			const pattern = doc as unknown as PatternEntry & { type: string; projectId: string };
			patternCache.set(pattern.id, {
				id: pattern.id,
				pattern: pattern.pattern,
				context: pattern.context,
				resolution: pattern.resolution,
				frequency: pattern.frequency,
				lastUsed: pattern.lastUsed,
				projectIds: pattern.projectIds,
				source: pattern.source,
			});
		}
		cacheLoaded = true;
	} catch (err) {
		console.warn("[KnowledgeStore] Failed to load from Cosmos:", err);
	}
}

/**
 * Record a new pattern or increment frequency if similar pattern exists.
 */
export async function recordPattern(params: {
	pattern: string;
	context: string;
	resolution: string;
	projectId: string;
	source: PatternSource;
}): Promise<PatternEntry> {
	await ensureCacheLoaded();

	// Check for existing similar pattern (simple text match)
	const existing = findExactMatch(params.pattern);
	if (existing) {
		existing.frequency += 1;
		existing.lastUsed = new Date().toISOString();
		if (!existing.projectIds.includes(params.projectId)) {
			existing.projectIds.push(params.projectId);
		}
		patternCache.set(existing.id, existing);
		persistPattern(existing);
		return existing;
	}

	// Create new pattern
	const entry: PatternEntry = {
		id: `pat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		pattern: params.pattern,
		context: params.context,
		resolution: params.resolution,
		frequency: 1,
		lastUsed: new Date().toISOString(),
		projectIds: [params.projectId],
		source: params.source,
	};

	patternCache.set(entry.id, entry);
	persistPattern(entry);
	return entry;
}

/**
 * Find patterns similar to the given context (text-based).
 * Returns patterns sorted by relevance (frequency * text overlap).
 */
export async function findSimilarPatterns(context: string, limit = 10): Promise<PatternEntry[]> {
	await ensureCacheLoaded();

	const contextWords = new Set(
		context
			.toLowerCase()
			.split(/\s+/)
			.filter((w) => w.length > 2),
	);

	const scored: Array<{ entry: PatternEntry; score: number }> = [];

	for (const entry of patternCache.values()) {
		const entryWords = new Set(
			`${entry.pattern} ${entry.context}`
				.toLowerCase()
				.split(/\s+/)
				.filter((w) => w.length > 2),
		);

		// Calculate word overlap score
		let overlap = 0;
		for (const word of contextWords) {
			if (entryWords.has(word)) overlap++;
		}

		if (overlap > 0) {
			// Weight by frequency and overlap
			const score = overlap * Math.log2(entry.frequency + 1);
			scored.push({ entry, score });
		}
	}

	return scored
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map((s) => s.entry);
}

/**
 * Get top patterns by frequency.
 */
export async function getTopPatterns(limit = 20): Promise<PatternEntry[]> {
	await ensureCacheLoaded();

	return [...patternCache.values()].sort((a, b) => b.frequency - a.frequency).slice(0, limit);
}

/**
 * Get all patterns for a specific project.
 */
export async function getPatternsByProject(projectId: string): Promise<PatternEntry[]> {
	await ensureCacheLoaded();

	return [...patternCache.values()].filter((p) => p.projectIds.includes(projectId));
}

/**
 * Extract patterns from completed run tasks.
 * Called by orchestrator after successful run completion.
 */
export async function extractPatternsFromRun(params: {
	projectId: string;
	tasks: Array<{ id: string; title: string; status: string; agentRole?: string }>;
	wasSuccessful: boolean;
}): Promise<PatternEntry[]> {
	const extracted: PatternEntry[] = [];
	const source: PatternSource = params.wasSuccessful ? "run-success" : "run-failure";

	for (const task of params.tasks) {
		if (task.status === "COMPLETED" || task.status === "FAILED") {
			const pattern = await recordPattern({
				pattern: task.title,
				context: `Task ${task.id} (${task.agentRole ?? "unknown"}) ${task.status.toLowerCase()} in project execution`,
				resolution:
					task.status === "COMPLETED"
						? `Successfully completed via ${task.agentRole ?? "agent"}`
						: "Failed — requires investigation or fixer loop",
				projectId: params.projectId,
				source,
			});
			extracted.push(pattern);
		}
	}

	return extracted;
}

// ─── Internal helpers ─────────────────────────────────────────

function findExactMatch(pattern: string): PatternEntry | undefined {
	const normalized = pattern.toLowerCase().trim();
	for (const entry of patternCache.values()) {
		if (entry.pattern.toLowerCase().trim() === normalized) {
			return entry;
		}
	}
	return undefined;
}

function persistPattern(entry: PatternEntry): void {
	db.documents
		.upsert(
			{
				...entry,
				projectId: "global",
				type: DOC_TYPE,
			} as unknown as UploadedDocument,
			"global",
		)
		.catch((err) => console.warn("[KnowledgeStore] Persist failed:", err));
}
