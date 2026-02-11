# Blueflame — Checkpoint (Cross-Tool Handoff)

> **Purpose**: This is the handoff document between Claude Code and Codex.
> Whichever tool picks up work next MUST read this file first.
> Updated by whichever tool finishes a work session.

---

## Last Updated By
- **Tool**: Claude Code
- **Date**: 2026-02-11
- **Session**: 5

## Current State
- **Phase**: S11 Failure Intelligence (planning complete, implementation next)
- **Last completed task**: Document updates — spec, README, tasks, status
- **Next task**: S11-001 — Normalized Failure Schema + ADO Adapter
- **Branch**: `main`
- **Repo is green**: YES (build, lint, test all pass — 397 tests)

## What Just Happened (Session 5)

### Visual Animations (Committed + Pushed)
- 16 CSS `@keyframes` in `globals.css` + Tailwind animation utilities
- 11 component files modified with dramatic visual moments:
  - Authorization launch (pulse-glow, ripple, modal-blast, spawn-agent)
  - Constraint violations (slide-in-top, shake-x toast)
  - Escalation (flash-red, escalate-pulse, badge-pop, reinforcement-arrive)
  - Budget wall (burn-progress gradient, warning-pulse, freeze-overlay)
  - Spec change (node-flash, preserved-glow, rebuild-pulse)
- 1 new component: `ConstraintViolationToast`
- `prefers-reduced-motion` respected globally
- 18 new dashboard tests + 7 constraint toast tests = 25 new tests

### Document Overhaul (This Session)
- **Spec (`Blueflame-Spec-v3-ACAR.md`)**: Added Section 10 (CI/CD Failure Intelligence), Workflow 7, Section 23 (Enterprise Upgrade Paths), Fixer agent role, failures Cosmos container, ADO in Azure services map. Renumbered all sections (22 → 24). Updated service counts (10→11 Foundry, 12→13 Azure, 7→8 Cosmos, 4→5 agents, 6→7 workflows).
- **README.md**: Complete rewrite — badges, problem/solution, mermaid architecture diagram, features, agent roles, 7 workflows, tech stack, enterprise upgrade paths, project structure, quick start, testing, security/governance, roadmap, hackathon section.
- **tasks-readable.md**: All 26 task statuses updated from "Not started" to DONE. Added S11-001 through S11-005 (Failure Intelligence). Updated dependency graph. Demo checklist updated for 7 workflows.
- **STATUS.md**: Updated to reflect current state (see below).
- **CHECKPOINT.md**: This file.

## Prior Sessions Summary

- **S1-001 through S10-002**: ALL COMPLETE (see Session 4 checkpoint for details)
- **S1-S10**: 26 tasks complete, 397 tests, all builds/lint/tests green
- **Key decisions**: Socket.IO over Azure SignalR SDK; MSAL v2/v3; Sub-path export for sha256; Test files excluded from tsc build; Biome over ESLint+Prettier

## What To Pick Up Next
1. **S11-001**: Normalized Failure Schema + ADO Adapter
   - Create `packages/shared/src/types/failure.ts` (Zod schema)
   - Create `apps/api/src/services/ado-adapter.ts` (ADO REST client)
   - Create `apps/api/src/webhooks/ado.ts` (service hook handler)
   - Create `apps/api/src/routes/failures.ts` (REST endpoints)
   - Tests for all above
2. **S11-002**: Failure Analyzer Agent (Foundry fixer agent)
3. **S11-003**: Remediation Authorization Gate
4. **S11-004**: Failure Intelligence Dashboard UI
5. **S11-005**: Enterprise Upgrade Path Documentation

## Blockers
- None

## Key Files to Read Before Starting
- `packages/shared/src/types/` — all domain types (add failure.ts here)
- `packages/foundry/src/agents/` — all 5 agents (pattern for fixer agent)
- `apps/api/src/services/` — orchestrator, authorization (pattern for remediation)
- `apps/api/src/webhooks/github.ts` — pattern for ADO webhook handler
- `apps/api/src/routes/` — existing route patterns
- `Blueflame-Spec-v3-ACAR.md` — section 10 (Failure Intelligence spec)

## Test Counts
| Scope | Count |
|-------|-------|
| apps/web | 97 |
| apps/api | 156 |
| packages/* | 144 |
| **Total** | **397** |

## Warnings for Next Tool
- `packages/shared` must be built before dependent packages (`npx turbo build`)
- Run state machine transitions enforced via `RUN_TRANSITIONS` constant — use in RunsRepository
- PlanLock is immutable — locks repository must NOT have update/delete methods
- Remediation creates NEW plan.lock with `parentLockId` — never modify existing locks
- Biome auto-fix needed after creating new files (`npm run lint:fix`)
- ADO webhook handler should follow same HMAC signature verification pattern as GitHub webhooks
- Failure schema needs TTL field for Cosmos container auto-cleanup
