# Blueflame — Checkpoint (Cross-Tool Handoff)

> **Purpose**: This is the handoff document between Claude Code and Codex.
> Whichever tool picks up work next MUST read this file first.
> Updated by whichever tool finishes a work session.

---

## Last Updated By
- **Tool**: Claude Code
- **Date**: 2026-02-11
- **Session**: 6

## Current State
- **Phase**: S11 Failure Intelligence — COMPLETE
- **Last completed task**: S11-004 — Failure Intelligence Dashboard UI
- **Next task**: Demo recording + submission (only non-code tasks remain)
- **Branch**: `main`
- **Repo is green**: YES (build, lint, test all pass — 453 tests)
- **Last commit**: `e41f161` — phase(s11): implement failure intelligence

## What Just Happened (Session 6)

### S11 Failure Intelligence — Full Implementation (Committed + Pushed)

**S11-001: Normalized Failure Schema + ADO Adapter**
- `packages/shared/src/types/failure.ts` — 8 interfaces (NormalizedFailure, Remediation, RootCauseAnalysis, RemediationTask, FailedStep, TestFailureDetail, TestResults, PipelineEnvironment)
- `packages/shared/src/types/enums.ts` — 4 new enums (FailureSource, FailureType, RemediationStatus, AgentRoleExtended)
- `apps/api/src/webhooks/ado.ts` — ADO webhook handler with HMAC signature verification, build.complete normalization, failed step/test extraction, runId extraction from tags/branch
- `apps/api/src/services/failure-store.ts` — In-memory failure store (query by id/runId/projectId)
- `apps/api/src/routes/failures.ts` — REST endpoints (GET all, by runId, by projectId, by id)

**S11-002: Fixer Agent (Foundry)**
- `packages/foundry/src/agents/fixer.ts` — analyzeFailure(), buildFixerPrompt(), parseFixerOutput() following verifier agent pattern
- `packages/foundry/src/agents/prompts/fixer-system.ts` — System prompt with analysis rules, confidence guidelines (0.0–1.0), remediation task format

**S11-003: Remediation Authorization Gate**
- `apps/api/src/services/remediation.ts` — Full lifecycle state machine: PENDING → ANALYZING → PLAN_READY → AUTHORIZED → EXECUTING → COMPLETED/FAILED
- `apps/api/src/routes/remediation.ts` — 8 REST endpoints for CRUD + state transitions

**S11-004: Failure Intelligence Dashboard UI**
- `apps/web/components/failures/FailureTimeline.tsx` — Chronological timeline with type-colored dots, branch display, remediation badges
- `apps/web/components/failures/RootCauseDisplay.tsx` — Summary, confidence gauge, root cause detail, affected files, remediation tasks
- `apps/web/components/failures/RemediationPlanView.tsx` — Status badge, parent/remediation lock links, authorize button (PLAN_READY state)
- `apps/web/app/project/[projectId]/failures/page.tsx` — Split-view page (timeline left, detail right)

**Wiring**
- `apps/api/src/index.ts` — adoWebhookRouter, failuresRouter, remediationRouter registered
- `packages/foundry/src/index.ts` — Fixer agent exports added

**Tests: +56 new (397 → 453)**
- 7 failure-store tests, 8 ADO webhook tests, 12 remediation service tests
- 9 fixer agent tests (prompt builder + output parser)
- 7 FailureTimeline tests, 8 RootCauseDisplay tests, 7 RemediationPlanView tests

## Prior Sessions Summary

- **Sessions 1–4**: S1-001 through S10-002 — ALL COMPLETE (26 tasks)
- **Session 5**: Visual animations (16 keyframes, 11 components) + document overhaul (spec, README, tasks, status)
- **Session 6**: S11 Failure Intelligence (5 tasks, 23 files, +2,399 lines, +56 tests)

## What To Pick Up Next
1. **Demo recording** — 7 workflows end-to-end demonstration
2. **Submission package** — hackathon entry materials
3. **Optional polish**: Integration testing, Playwright E2E, edge case hardening

## Blockers
- None

## Key Files Reference
- `Blueflame-Spec-v3-ACAR.md` — Source of truth (24 sections)
- `packages/shared/src/types/` — All domain types including failure.ts
- `packages/foundry/src/agents/` — All 5 agents (designer, spec-generator, planner, builder, verifier, fixer)
- `apps/api/src/services/` — All services (orchestrator, authorization, failure-store, remediation)
- `apps/api/src/webhooks/` — GitHub + ADO webhook handlers
- `apps/web/components/failures/` — Failure Intelligence UI

## Test Counts
| Scope | Count |
|-------|-------|
| apps/web | 119 |
| apps/api | 181 |
| packages/foundry | 81 |
| packages/cosmos | 44 |
| packages/github-app | 24 |
| packages/shared | 4 |
| **Total** | **453** |

## Warnings for Next Tool
- `packages/shared` must be built before dependent packages (`npx turbo build`)
- PlanLock is immutable — never modify existing locks
- Remediation creates NEW plan.lock with `parentLockId` — never modify existing locks
- Biome auto-fix needed after creating new files (`npx biome check --fix .`)
- All in-memory stores (failure-store, remediation) have `clearAll*()` for testing
- ADO webhook follows same HMAC signature pattern as GitHub webhooks
- Failure schema has TTL field (30 days) for Cosmos container auto-cleanup
- Dashboard UI components need `afterEach(cleanup)` in tests (jsdom doesn't auto-cleanup)
