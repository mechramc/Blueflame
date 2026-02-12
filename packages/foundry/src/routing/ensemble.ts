/**
 * Ensemble execution — multi-model completion for high-variance tasks.
 *
 * When self-consistency sampling detects high variance (responses diverge),
 * escalate to a multi-model ensemble: run the same prompt across different
 * providers and combine results.
 *
 * Strategy:
 * - Code generation: majority vote (most similar wins)
 * - Test generation: union (combine all unique tests)
 * - General: majority vote
 */

import { selectByMajorityVote } from "./self-consistency.js";
import type { ChatMessage, ChatOptions, ChatResponse, FoundryModelClient } from "./types.js";

/** Ensemble execution mode */
export enum EnsembleStrategy {
	/** Select the response most similar to others */
	MajorityVote = "MAJORITY_VOTE",
	/** Combine unique content from all responses */
	Union = "UNION",
}

/** Result of an ensemble execution */
export interface EnsembleResult {
	/** Individual responses from each model */
	responses: ChatResponse[];
	/** Final combined response */
	result: ChatResponse;
	/** Strategy used to combine */
	strategy: EnsembleStrategy;
	/** Total tokens consumed across all models */
	totalInputTokens: number;
	totalOutputTokens: number;
	/** Models that participated */
	models: string[];
}

/**
 * Run ensemble across multiple model clients.
 * All clients receive the same messages; results are combined per strategy.
 */
export async function runEnsemble(
	clients: FoundryModelClient[],
	messages: ChatMessage[],
	strategy: EnsembleStrategy,
	options?: ChatOptions,
): Promise<EnsembleResult> {
	if (clients.length === 0) {
		throw new Error("Ensemble requires at least one client");
	}

	// Run all models in parallel
	const responses = await Promise.all(clients.map((c) => c.chat(messages, options)));

	const totalInputTokens = responses.reduce((sum, r) => sum + r.inputTokens, 0);
	const totalOutputTokens = responses.reduce((sum, r) => sum + r.outputTokens, 0);
	const models = responses.map((r) => r.model);

	let result: ChatResponse;

	switch (strategy) {
		case EnsembleStrategy.MajorityVote:
			result = selectByMajorityVote(responses);
			break;
		case EnsembleStrategy.Union:
			result = unionResponses(responses);
			break;
		default: {
			const _exhaustive: never = strategy;
			throw new Error(`Unknown ensemble strategy: ${_exhaustive}`);
		}
	}

	return {
		responses,
		result,
		strategy,
		totalInputTokens,
		totalOutputTokens,
		models,
	};
}

/**
 * Union strategy: combine unique content blocks from all responses.
 * Splits on double-newlines, deduplicates, and joins.
 * Best for test generation where each model might produce different tests.
 */
function unionResponses(responses: ChatResponse[]): ChatResponse {
	const allBlocks = new Set<string>();

	for (const response of responses) {
		const blocks = response.content
			.split(/\n{2,}/)
			.map((b) => b.trim())
			.filter(Boolean);
		for (const block of blocks) {
			allBlocks.add(block);
		}
	}

	const combined = [...allBlocks].join("\n\n");

	return {
		content: combined,
		inputTokens: responses.reduce((sum, r) => sum + r.inputTokens, 0),
		outputTokens: responses.reduce((sum, r) => sum + r.outputTokens, 0),
		model: `ensemble(${responses.map((r) => r.model).join(",")})`,
	};
}
