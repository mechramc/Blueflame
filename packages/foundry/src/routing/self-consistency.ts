/**
 * Self-consistency sampling — parallel completions for high-σ tasks.
 *
 * For tasks with σ > 0.7, run N parallel completions and compute variance.
 * If variance exceeds threshold, escalate to multi-model ensemble.
 * σ is a routing primitive, NOT a quality score.
 */

import type { ChatMessage, ChatOptions, ChatResponse, FoundryModelClient } from "./types.js";

/** Result of a self-consistency sampling run */
export interface SamplingResult {
	/** Individual responses from N completions */
	responses: ChatResponse[];
	/** Selected response (majority vote or best candidate) */
	selected: ChatResponse;
	/** Normalized variance across responses (0=identical, 1=maximally divergent) */
	variance: number;
	/** Total tokens consumed across all samples */
	totalInputTokens: number;
	totalOutputTokens: number;
	/** Whether ensemble escalation was triggered */
	escalated: boolean;
}

/** Configuration for self-consistency sampling */
export interface SamplingConfig {
	/** Number of parallel completions (default: 3) */
	n: number;
	/** Variance threshold for escalation (default: 0.6) */
	escalationThreshold: number;
}

const DEFAULT_CONFIG: SamplingConfig = {
	n: 3,
	escalationThreshold: 0.6,
};

/**
 * Compute normalized variance between response contents.
 * Uses character-level Jaccard distance averaged across pairs.
 * Returns 0 for identical responses, approaches 1 for maximally different.
 */
export function computeVariance(responses: string[]): number {
	if (responses.length <= 1) return 0;

	let totalDistance = 0;
	let pairCount = 0;

	for (let i = 0; i < responses.length; i++) {
		for (let j = i + 1; j < responses.length; j++) {
			const a = responses[i] ?? "";
			const b = responses[j] ?? "";
			totalDistance += jaccardDistance(a, b);
			pairCount++;
		}
	}

	return pairCount > 0 ? totalDistance / pairCount : 0;
}

/**
 * Jaccard distance between two strings using word-level tokens.
 * Returns 0 for identical, 1 for completely different.
 */
function jaccardDistance(a: string, b: string): number {
	const setA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
	const setB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));

	if (setA.size === 0 && setB.size === 0) return 0;

	let intersection = 0;
	for (const word of setA) {
		if (setB.has(word)) intersection++;
	}

	const union = setA.size + setB.size - intersection;
	if (union === 0) return 0;

	return 1 - intersection / union;
}

/**
 * Select the best response via majority vote (most similar to others).
 * Returns the response with the lowest average distance to all others.
 */
export function selectByMajorityVote(responses: ChatResponse[]): ChatResponse {
	if (responses.length === 0) {
		throw new Error("Cannot select from empty responses");
	}
	if (responses.length === 1) return responses[0]!;

	const contents = responses.map((r) => r.content);
	let bestIndex = 0;
	let bestAvgDistance = Number.POSITIVE_INFINITY;

	for (let i = 0; i < contents.length; i++) {
		let totalDistance = 0;
		for (let j = 0; j < contents.length; j++) {
			if (i !== j) {
				totalDistance += jaccardDistance(contents[i] ?? "", contents[j] ?? "");
			}
		}
		const avgDistance = totalDistance / (contents.length - 1);
		if (avgDistance < bestAvgDistance) {
			bestAvgDistance = avgDistance;
			bestIndex = i;
		}
	}

	return responses[bestIndex]!;
}

/**
 * Run self-consistency sampling: N parallel completions with variance check.
 *
 * @param client - Model client to use for completions
 * @param messages - Chat messages to send
 * @param options - Chat options (temperature should be > 0 for diversity)
 * @param config - Sampling configuration
 * @returns SamplingResult with selected response and variance metrics
 */
export async function runSelfConsistency(
	client: FoundryModelClient,
	messages: ChatMessage[],
	options?: ChatOptions,
	config?: Partial<SamplingConfig>,
): Promise<SamplingResult> {
	const cfg = { ...DEFAULT_CONFIG, ...config };

	// Use temperature > 0 for diversity (default to 0.7 if not set)
	const samplingOptions: ChatOptions = {
		...options,
		temperature: options?.temperature ?? 0.7,
	};

	// Run N completions in parallel
	const promises = Array.from({ length: cfg.n }, () => client.chat(messages, samplingOptions));
	const responses = await Promise.all(promises);

	// Compute variance
	const contents = responses.map((r) => r.content);
	const variance = computeVariance(contents);

	// Select best via majority vote
	const selected = selectByMajorityVote(responses);

	// Sum tokens
	const totalInputTokens = responses.reduce((sum, r) => sum + r.inputTokens, 0);
	const totalOutputTokens = responses.reduce((sum, r) => sum + r.outputTokens, 0);

	return {
		responses,
		selected,
		variance,
		totalInputTokens,
		totalOutputTokens,
		escalated: variance > cfg.escalationThreshold,
	};
}
