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

// Security constraint types
export {
	type CveCheckConfig,
	type DependencyAuditConfig,
	type LicenseComplianceConfig,
	type SecretScanningConfig,
	type SecurityConstraint,
	type SecurityConstraintConfig,
	CveCheckSchema,
	DependencyAuditSchema,
	LicenseComplianceSchema,
	SecretScanningSchema,
	SecurityConstraintConfigSchema,
	SecurityConstraintSubtype,
} from "./security-constraints.js";

// Action events
export type { ActionEvent } from "./action-event.js";

// Audit
export type { AuditEventType, AuditLogEntry, AuditOutcome } from "./audit.js";

// Chargeback
export type { ChargebackEntry } from "./chargeback.js";

// Pending Fix (WF3 fixer loop)
export type { PendingFix } from "./pending-fix.js";

// Project
export type { Project, ProjectStatus } from "./project.js";

// Knowledge (WF7)
export type { PatternEntry, PatternSource } from "./knowledge.js";

// State machine helpers
export { RUN_TRANSITIONS } from "./run.js";

// SCR (Spec Change Request) types
export { SCRSeverity, SCRStatus } from "./scr.js";
export type {
	BaselineSnapshot,
	DiffPack,
	DiffPackItem,
	SpecChangeRequest,
	TaskPatch,
	TaskPatchEntry,
} from "./scr.js";
