/**
 * Knowledge Integration types — WF7 organizational learning.
 *
 * Patterns extracted from successful and failed runs are stored
 * for future reference and semantic similarity matching.
 */

/** A reusable pattern learned from project execution */
export interface PatternEntry {
	id: string;
	/** What the pattern addresses (e.g., "auth middleware setup", "DB connection pooling") */
	pattern: string;
	/** Surrounding context — what project/task/failure led to this pattern */
	context: string;
	/** How to apply or resolve using this pattern */
	resolution: string;
	/** How many times this pattern has been observed */
	frequency: number;
	/** Last time this pattern was referenced */
	lastUsed: string;
	/** Project IDs where this pattern was observed */
	projectIds: string[];
	/** Source of the pattern: "run-success", "run-failure", "manual" */
	source: PatternSource;
}

export type PatternSource = "run-success" | "run-failure" | "manual";
