/**
 * All domain enums for Blueflame.
 * Source: Blueflame-Spec-v3-ACAR.md sections 7.1, 13.2, 14.2, 16.2
 */

/** Run lifecycle states (Section 13.2 / 16.2) */
export enum RunStatus {
	Pending = "PENDING",
	Authorized = "AUTHORIZED",
	Executing = "EXECUTING",
	Paused = "PAUSED",
	Completed = "COMPLETED",
	Failed = "FAILED",
	Partial = "PARTIAL",
}

/** Spec lifecycle states (Section 10, Stage 2-3) */
export enum SpecStatus {
	Draft = "DRAFT",
	Accepted = "ACCEPTED",
	Frozen = "FROZEN",
}

/** Agent roles in the swarm (Section 7.1) */
export enum AgentRole {
	Planner = "PLANNER",
	Builder = "BUILDER",
	Verifier = "VERIFIER",
	Explainer = "EXPLAINER",
}

/** Agent execution states (Section 13.2) */
export enum AgentStatus {
	Idle = "IDLE",
	Executing = "EXECUTING",
	Completed = "COMPLETED",
	Failed = "FAILED",
}

/** RBAC tiers (Section 15) */
export enum UserRole {
	Viewer = "Blueflame.Viewer",
	Editor = "Blueflame.Editor",
	Authorizer = "Blueflame.Authorizer",
	Admin = "Blueflame.Admin",
}

/** Constraint scope (Section 14.2) */
export enum ConstraintScope {
	Project = "project",
	Module = "module",
	File = "file",
}

/** Constraint category (Section 14.2) */
export enum ConstraintType {
	Architectural = "architectural",
	Behavioral = "behavioral",
	Performance = "performance",
	Security = "security",
	Dependency = "dependency",
}

/** Constraint enforcement level (Section 14.2) */
export enum ConstraintEnforcement {
	Hard = "hard",
	Soft = "soft",
}

/** Constraint origin (Section 14.2) */
export enum ConstraintSource {
	UserDefined = "user-defined",
	ExtractedFromCodebase = "extracted-from-codebase",
	PromotedFromSpec = "promoted-from-spec",
}

/** Uploaded document type (Section 13.2 documents container) */
export enum DocumentType {
	PRD = "PRD",
	RFC = "RFC",
	Ticket = "Ticket",
}

/** Task status within a plan (Section 7.4) */
export enum TaskStatus {
	Pending = "PENDING",
	Running = "RUNNING",
	Completed = "COMPLETED",
	Failed = "FAILED",
	Deferred = "DEFERRED",
}

/** Budget decision when paused at 95% (Section 16.2) */
export enum BudgetDecision {
	Resume = "RESUME",
	Accept = "ACCEPT",
	Abandon = "ABANDON",
}
