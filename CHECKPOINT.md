# Blueflame — Checkpoint (Cross-Tool Handoff)

> **Purpose**: This is the handoff document between Claude Code and Codex.
> Whichever tool picks up work next MUST read this file first.
> Updated by whichever tool finishes a work session.

---

## Last Updated By
- **Tool**: Claude Code
- **Date**: 2026-02-11
- **Session**: 1

## Current State
- **Phase**: S1 Scaffold & Infrastructure
- **Last completed task**: S1-005 — Shared TypeScript types
- **Next task**: S1-002 — Azure Bicep templates, S1-003 — CI/CD, S1-004 — SignalR
- **Branch**: `main`
- **Repo is green**: YES (build, lint, test all pass)

## What Just Happened
- **S1-001 COMPLETE**: Turborepo monorepo fully scaffolded (6 packages)
- **S1-005 COMPLETE**: All domain types created in `packages/shared/src/types/`
  - 11 enums: RunStatus, SpecStatus, AgentRole, AgentStatus, UserRole, ConstraintScope, ConstraintType, ConstraintEnforcement, ConstraintSource, DocumentType, TaskStatus, BudgetDecision
  - 7 domain interfaces: OutputSpec, TaskPlan/PlanTask, PlanLock, Run, AgentState, Constraint, UploadedDocument
  - Run state machine transitions (RUN_TRANSITIONS constant)
  - Result<T, E> utility type
  - All re-exported from `@blueflame/shared`

## What To Pick Up Next
1. **S1-002**: Azure Bicep templates (`infra/`) — 7 Cosmos containers, SignalR, Key Vault, Container Apps
2. **S1-003**: CI/CD pipelines (`.github/workflows/ci.yml`, `deploy.yml`)
3. **S1-004**: SignalR connection between web and api
4. **S2-001**: Entra ID authentication (depends on S1-001)
5. **S2-002**: RBAC middleware (depends on S2-001)

## Blockers
- None

## Key Files to Read Before Starting
- `packages/shared/src/types/` — all domain types (read before implementing repos/services)
- `Blueflame-Spec-v3-ACAR.md` — sections 8 (infra), 9 (CI/CD), 13.2 (Cosmos containers)
- `tasks.yaml` — acceptance criteria for each task

## Test Counts
| Scope | Count |
|-------|-------|
| Total | 0 (domain types have no runtime logic to test yet) |

## Warnings for Next Tool
- `packages/shared` must be built before dependent packages (`npx turbo build`)
- Run state machine transitions are enforced via `RUN_TRANSITIONS` constant — use in RunsRepository
- PlanLock is immutable — locks repository must NOT have update/delete methods
- Biome auto-fix needed after creating new files (`npm run lint:fix`)
