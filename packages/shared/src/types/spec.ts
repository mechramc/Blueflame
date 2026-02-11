/**
 * OutputSpec and related types.
 * Source: Blueflame-Spec-v3-ACAR.md Section 10 (Stage 2) + Section 13.2 (specs container)
 */

import type { SpecStatus } from "./enums.js";

/** A single testable acceptance criterion with a unique ID for traceability */
export interface AcceptanceCriterion {
	/** Unique ID, e.g. "AC-001" */
	id: string;
	/** Human-readable description of the criterion */
	description: string;
	/** How to verify: test suite, static analysis, manual, etc. */
	verificationMethod: string;
}

/** A deliverable that must exist at project completion */
export interface Deliverable {
	/** Unique ID, e.g. "DEL-001" */
	id: string;
	/** What must be produced */
	description: string;
	/** File paths or artifact references */
	artifacts: string[];
}

/** An identified risk with mitigation strategy */
export interface Risk {
	/** Unique ID, e.g. "RISK-001" */
	id: string;
	/** Description of what could go wrong */
	description: string;
	/** Severity: low, medium, high, critical */
	severity: "low" | "medium" | "high" | "critical";
	/** Mitigation strategy */
	mitigation: string;
}

/** Constraint references within a spec */
export interface SpecConstraints {
	/** Hard requirements — must be satisfied */
	must: string[];
	/** Prohibited actions — must not occur */
	mustNot: string[];
}

/** The core specification artifact (Cosmos DB: specs container) */
export interface OutputSpec {
	/** Cosmos DB document ID */
	id: string;
	/** Partition key */
	projectId: string;
	/** Unique spec identifier */
	specId: string;
	/** Spec version number (increments on freeze) */
	version: number;
	/** Current lifecycle status */
	status: SpecStatus;
	/** SHA-256 hash of spec content (set on freeze) */
	specHash: string | null;
	/** Spec title */
	title: string;
	/** Free-form description / summary */
	description: string;
	/** What must exist at completion */
	deliverables: Deliverable[];
	/** Testable conditions with unique IDs */
	acceptanceCriteria: AcceptanceCriterion[];
	/** Hard and soft constraints */
	constraints: SpecConstraints;
	/** Explicitly out of scope */
	nonGoals: string[];
	/** Identified risks */
	risks: Risk[];
	/** Completion statement */
	definitionOfDone: string;
	/** Auto-loaded from project-level constraint registry */
	inheritedConstraints: string[];
	/** Raw YAML content */
	content: string;
	/** ISO 8601 creation timestamp */
	createdAt: string;
	/** ISO 8601 last update timestamp */
	updatedAt: string;
	/** User ID of creator */
	createdBy: string;
}
