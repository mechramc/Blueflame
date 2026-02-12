# Blueflame — Checkpoint (Cross-Tool Handoff)

> **Purpose**: This is the handoff document between Claude Code and Codex.
> Whichever tool picks up work next MUST read this file first.
> Updated by whichever tool finishes a work session.

---

## Last Updated By
- **Tool**: Claude Code
- **Date**: 2026-02-11
- **Session**: 7

## Current State
- **Phase**: Enterprise Adaptability — planning complete, implementation next
- **Last completed task**: UI redesign (30+ components) + enterprise implementation plan (20 tasks across 4 streams)
- **Next task**: S12-001 (ACAR σ-routing) — highest priority, core differentiator
- **Branch**: `main`
- **Repo is green**: YES (build, lint, test all pass — 453 tests)
- **Last commit**: `6604da6` — phase(web): redesign UI with professional dark theme + fix env loading

## What Just Happened (Session 7)

### UI Redesign — Professional Dark Theme (Committed + Pushed)

Replaced generic gray-950 aesthetic with cohesive blue-tinted dark theme inspired by Linear/Vercel/Raycast:

- **Design foundation**: CSS custom properties (`--bg-primary` through `--text-muted`), Inter + JetBrains Mono fonts via `next/font/google`, blue-tinted palette (#0a0a0f → #1a1a2e)
- **NavHeader**: Frosted glass (`backdrop-blur-xl bg-[--bg-primary]/80`), gradient wordmark, connection status dot
- **Landing page**: Grid background pattern, gradient hero text, accent-bordered project cards, inline seed button
- **Chat**: Linear-style message rows (no bubbles), blue left border for agent messages, frosted glass input bar
- **Spec editor**: Ghost buttons (border-only, hover fill), dot+label status badges
- **Dashboard**: Full dark conversion — role-colored agent cards (purple=Builder, teal=Verifier), dark SVG DAG, terminal-style action stream
- **All remaining components**: Budget, failures, plan, constraints — consistent dark theme
- **37 files changed**, 638 insertions, 481 deletions
- **Test fixes**: Updated 5 test files to match new CSS classes (12 assertions updated)

### Environment Fix
- Added `dotenv` to API, loading `.env` from repo root via `import.meta.dirname`
- Renamed Cosmos vars (`COSMOS_DB_*` → `COSMOS_*`) to match code expectations
- Added `FOUNDRY_DEPLOYMENT`, `FOUNDRY_SPEC_DEPLOYMENT`, `FOUNDRY_PLANNER_DEPLOYMENT`

### Enterprise Implementation Plan — 4 Streams, 20 Tasks

Full audit revealed gaps between spec claims and implementation. Created comprehensive plan:

| Stream | System | Tasks | Priority Focus |
|--------|--------|-------|----------------|
| **S12: ACAR σ-Routing** | Routing engine | 3 tasks | Make σ-routing real (currently hardcoded gpt-4o) |
| **S13: Enterprise Governance** | Tracing + compliance | 3 tasks | OpenTelemetry → App Insights, compliance dashboard |
| **S14: Spec Delta Detection** | WF6 implementation | 2 tasks | Spec change → surgical re-execution |
| **S15: CI/CD Templates** | Failure intelligence | 5 tasks | Cosmos failures, verifier templates, ADO outbound |
| **S16: Enterprise Budgeting** | MS integration | 5 tasks | Azure Cost Mgmt, org pools, SignalR migration |

**New dependencies to install**: `@azure/monitor-opentelemetry`, `applicationinsights`, `@azure/arm-costmanagement`, `@microsoft/signalr`, `azure-devops-node-api`

## Prior Sessions Summary

- **Sessions 1–4**: S1-001 through S10-002 — ALL COMPLETE (26 tasks)
- **Session 5**: Visual animations (16 keyframes, 11 components) + document overhaul
- **Session 6**: S11 Failure Intelligence (5 tasks) + Demo wiring (7 tasks)
- **Session 7**: UI redesign (30+ components) + env fix + enterprise planning (20 tasks defined)

## What To Pick Up Next

### Tomorrow's Session — Priority Order

1. **S12-001: ACAR σ-routing** (~2 hrs) — HIGHEST PRIORITY
   - Replace hardcoded `"gpt-4o"` in `orchestrator.ts` line 128
   - Create `packages/foundry/src/routing/sigma-router.ts`
   - Three tiers: σ < 0.3 → gpt-4o-mini, 0.3–0.7 → gpt-4o, > 0.7 → o1
   - Ensure 3 model deployments exist in Azure OpenAI resource

2. **S13-001: OpenTelemetry tracing** (~4 hrs)
   - Install `@azure/monitor-opentelemetry`
   - Instrument all 6 agents with span start/end
   - Connect to App Insights via `APPLICATIONINSIGHTS_CONNECTION_STRING`

3. **S15-001: Cosmos failures container** (~2 hrs)
   - Add 8th container to Bicep
   - Create `FailuresRepository`
   - Migrate `failure-store.ts` from in-memory Map to Cosmos

4. **S14-001 + S14-002: Spec delta detection** (~7 hrs)
   - Delta engine: compare spec v1 vs v2
   - Impact classifier: PRESERVE/REBUILD/NEW/REMOVE per task
   - UI: color-coded impact map

5. **Remaining P0 tasks**: S13-002, S15-002, S16-001, S16-002

### Parallel Worktree Strategy
- `Blueflame-pkg`: S12-001 + S12-002 (foundry routing)
- `Blueflame-api`: S13-001 + S15-001 (tracing + Cosmos failures)
- `Blueflame-web`: S13-002 + S14-002 (compliance dashboard + delta UI)

## Blockers
- **ACAR credibility risk**: Spec claims σ-routing as core differentiator, but orchestrator hardcodes gpt-4o. S12-001 is mandatory before demo.
- **Azure model deployments**: Need gpt-4o-mini + gpt-4o + o1 deployments in Azure OpenAI resource for σ-routing to work.

## Key Files Reference
- `Blueflame-Spec-v3-ACAR.md` — Source of truth (24 sections)
- `tasks.yaml` — Now includes S12–S16 (20 enterprise tasks)
- `docs/STATUS.md` — Updated with enterprise streams
- `packages/foundry/src/agents/` — All 6 agents (designer, spec-generator, planner, builder, verifier, explainer, fixer)
- `apps/api/src/services/orchestrator.ts` — **Line 128**: hardcoded `"gpt-4o"` to replace
- `packages/foundry/src/config.ts` — Foundry client config (needs multi-model support)
- `apps/web/app/globals.css` — Design system CSS variables
- `apps/web/tailwind.config.ts` — Custom `bf.*` color tokens

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
- Remediation creates NEW plan.lock with `parentLockId`
- Biome auto-fix needed after creating new files (`npx biome check --fix .`)
- All in-memory stores (failure-store, remediation) have `clearAll*()` for testing
- ADO webhook follows same HMAC signature pattern as GitHub webhooks
- Failure schema has TTL field (30 days) for Cosmos container auto-cleanup
- Dashboard UI components need `afterEach(cleanup)` in tests (jsdom doesn't auto-cleanup)
- **New**: CSS uses custom properties (`--bg-primary`, `--accent`, etc.) — not direct Tailwind colors
- **New**: Fonts loaded via `next/font/google` with CSS variable strategy (`--font-sans`, `--font-mono`)
- **New**: `dotenv` loads `.env` from repo root in API via `import.meta.dirname`
