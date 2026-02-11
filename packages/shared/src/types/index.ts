/**
 * @blueflame/shared — Type re-exports
 *
 * All domain types, enums, and utilities are re-exported from here.
 * Import via: import { OutputSpec, RunStatus, ... } from "@blueflame/shared";
 */

// Enums
export {
	AgentRole,
	AgentRoleExtended,
	AgentStatus,
	BudgetDecision,
	ConstraintEnforcement,
	ConstraintScope,
	ConstraintSource,
	ConstraintType,
	DocumentType,
	FailureSource,
	FailureType,
	RemediationStatus,
	RunStatus,
	SpecStatus,
	TaskStatus,
	UserRole,
} from "./enums.js";

// Domain types
export type { AgentState } from "./agent.js";
export type { Constraint } from "./constraint.js";
export type { UploadedDocument } from "./document.js";
export type { AgentPermissions, PlanLock } from "./lock.js";
export type { PlanTask, TaskPlan } from "./plan.js";
export type { Run } from "./run.js";
export type {
	AcceptanceCriterion,
	Deliverable,
	OutputSpec,
	Risk,
	SpecConstraints,
} from "./spec.js";

export type { ChatMessage, MessageRole } from "./message.js";

// Failure Intelligence types
export type {
	FailedStep,
	NormalizedFailure,
	PipelineEnvironment,
	Remediation,
	RemediationTask,
	RootCauseAnalysis,
	TestFailureDetail,
	TestResults,
} from "./failure.js";

// State machine helpers
export { RUN_TRANSITIONS } from "./run.js";
