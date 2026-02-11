# Blueflame — Checkpoint (Cross-Tool Handoff)

> **Purpose**: This is the handoff document between Claude Code and Codex.
> Whichever tool picks up work next MUST read this file first.
> Updated by whichever tool finishes a work session.

---

## Last Updated By
- **Tool**: Claude Code
- **Date**: 2026-02-11
- **Session**: 6 (continued)

## Current State
- **Phase**: Demo Wiring — COMPLETE
- **Last completed task**: Demo seed endpoint + full page wiring verification
- **Next task**: Demo recording + submission (only non-code tasks remain)
- **Branch**: `main`
- **Repo is green**: YES (build, lint, test all pass — 453 tests)
- **Last commit**: `3bf809a` — phase(demo): wire all pages to API, add navigation, demo seed endpoint

## What Just Happened (Session 6 continued)

### Demo Wiring — All Pages Now Functional (Committed + Pushed)

Full audit revealed most web pages were shells with no API wiring. Fixed all 7 issues:

**Navigation + Landing**
- `apps/web/components/layout/NavHeader.tsx` — NEW: Contextual breadcrumb nav (Projects / Spec / Run / Failures) with "Demo Mode" badge
- `apps/web/app/layout.tsx` — NavHeader mounted in root layout (44px header on all pages)
- `apps/web/app/page.tsx` — Rewritten: demo project card with links to all 3 views + feature highlights

**Chat Panel (fully wired)**
- `apps/web/components/chat/ChatPanel.tsx` — Rewritten: GET /api/chat/:projectId (history), POST /api/chat (send), Socket.IO run:status (streaming tokens), graceful fallbacks

**Spec Editor (self-contained)**
- `apps/web/components/spec/SpecEditor.tsx` — Rewritten: GET /api/specs/:projectId (load), POST /api/specs/generate, PUT accept/freeze. Removed external `onGenerateSpec` prop.
- `apps/web/app/project/[projectId]/page.tsx` — Simplified (SpecEditor is now self-wired)

**Failures Page (fully wired)**
- `apps/web/app/project/[projectId]/failures/page.tsx` — Rewritten: GET /api/failures?projectId, GET /api/remediation?failureId, POST /api/remediation/:id/authorize

**Demo Seed Endpoint**
- `apps/api/src/routes/demo-seed.ts` — NEW: POST /api/demo/seed (4 conversations, 1 YAML spec, 3 failures, 2 remediations with root cause), POST /api/demo/reset
- `apps/api/src/index.ts` — demoSeedRouter wired at /api/demo

**Biome fixes**: 24 files auto-formatted (import sorting, CRLF normalization)

### S11 Failure Intelligence (earlier in session 6)

- S11-001 through S11-005 all complete (see prior sessions summary)
- +56 tests, +2,399 lines across 23 files

## Prior Sessions Summary

- **Sessions 1–4**: S1-001 through S10-002 — ALL COMPLETE (26 tasks)
- **Session 5**: Visual animations (16 keyframes, 11 components) + document overhaul (spec, README, tasks, status)
- **Session 6**: S11 Failure Intelligence (5 tasks, 23 files, +2,399 lines, +56 tests) + Demo wiring (7 tasks, 22 files, +940 lines)

## What To Pick Up Next
1. **Run the demo**: `npm run dev` in apps/api + apps/web, hit POST /api/demo/seed, browse the UI
2. **Demo recording** — 7 workflows end-to-end demonstration
3. **Submission package** — hackathon entry materials
4. **Optional polish**: Integration testing, Playwright E2E, edge case hardening

## Blockers
- None

## Key Files Reference
- `Blueflame-Spec-v3-ACAR.md` — Source of truth (24 sections)
- `packages/shared/src/types/` — All domain types including failure.ts
- `packages/foundry/src/agents/` — All 5 agents (designer, spec-generator, planner, builder, verifier, fixer)
- `apps/api/src/services/` — All services (orchestrator, authorization, failure-store, remediation)
- `apps/api/src/routes/demo-seed.ts` — Demo data seeder (conversations, spec, failures, remediations)
- `apps/api/src/webhooks/` — GitHub + ADO webhook handlers
- `apps/web/components/layout/NavHeader.tsx` — Global navigation header
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
