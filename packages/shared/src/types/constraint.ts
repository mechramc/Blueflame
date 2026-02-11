/**
 * Constraint (project-level constraint registry).
 * Source: Blueflame-Spec-v3-ACAR.md Section 14.2 (constraints container)
 */

import type {
	ConstraintEnforcement,
	ConstraintScope,
	ConstraintSource,
	ConstraintType,
} from "./enums.js";

/** A project-level constraint rule (Cosmos DB: constraints container) */
export interface Constraint {
	/** Cosmos DB document ID */
	id: string;
	/** Unique constraint identifier, e.g. "CONST-001" */
	constraintId: string;
	/** Partition key */
	projectId: string;
	/** Scope of applicability */
	scope: ConstraintScope;
	/** Category */
	type: ConstraintType;
	/** Natural language rule statement */
	rule: string;
	/** Fail on violation (hard) or warn (soft) */
	enforcement: ConstraintEnforcement;
	/** How to verify: test suite, static analysis, AST check, manual */
	verificationMethod: string;
	/** Where this constraint came from */
	source: ConstraintSource;
	/** ISO 8601 creation timestamp */
	createdAt: string;
	/** ISO 8601 last update timestamp */
	updatedAt: string;
	/** User ID of creator */
	createdBy: string;
}
