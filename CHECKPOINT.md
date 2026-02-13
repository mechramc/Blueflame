# Blueflame — Checkpoint (Cross-Tool Handoff)

> **Purpose**: This is the handoff document between Claude Code and Codex.
> Whichever tool picks up work next MUST read this file first.
> Updated by whichever tool finishes a work session.

---

## Last Updated By
- **Tool**: Claude Code
- **Date**: 2026-02-12
- **Session**: 11

## Current State
- **Phase**: Integration & E2E Testing — All 12 gap resolution phases complete
- **Last completed task**: Fixed SpecActions.tsx "Generate Plan & Execute" button to match actual API contracts
- **Next task**: Test Spec→Plan→Execute flow end-to-end in browser, then commit staged changes
- **Branch**: `main`
- **Repo is green**: YES (full build passes — 6/6 turbo tasks)
- **CI/CD**: Last push had lint/deploy fixes staged but not yet committed
- **Last commit**: `4baf28e` — Image refs added
- **Live API**: `https://blueflame-api-dev.blackfield-ff30bbff.centralus.azurecontainerapps.io`
- **Live Web**: `https://blueflame-web-dev.blackfield-ff30bbff.centralus.azurecontainerapps.io`
- **Licensing**: BSL 1.1 (source-available, Murai Labs commercial ownership)

## What Just Happened (Sessions 10–11)

### Gap Resolution — All 12 Phases Complete

Resolved all 13 integration gaps identified in the gap analysis. Every phase verified via build. ~61 files changed, ~3400 lines added.

#### Phase 1: Auth Wiring + Dev Role Picker
- Dev bypass in `auth.ts` when `ENTRA_TENANT_ID` not set (reads `X-Dev-Role` header)
- `DevAuthProvider.tsx` with role picker dropdown + yellow banner
- `api-client.ts` with `apiGet`/`apiPost`/`apiPut` (sets `X-Dev-Role` header in dev mode)
- `useRole.ts` hook reads from DevAuth context in dev mode

#### Phase 2: Projects CRUD API
- `Project` type in shared, `ProjectsRepository` in cosmos
- `projects.ts` route with GET/POST/PUT/DELETE + Zod validation
- Projects container added to Cosmos Bicep + created in Azure

#### Phase 3: Dynamic Home Page
- Rewrote `page.tsx` to fetch from `/api/projects`
- `ProjectCard`, `CreateProjectDialog`, `ProjectStatusBadge` components
- `useProjects` hook with fetch/cache/create

#### Phase 4: Run Dashboard API Contract Fix
- Fixed `GET /api/execution/:runId` response shape
- Added `events: ActionEvent[]` to RunState in orchestrator
- Event emission on task spawn, agent spawn, task complete, task fail, budget warning

#### Phase 5: Navigation
- Added Compliance and Chargeback links to NavHeader right side

#### Phase 6: Compliance Backend
- `logAuditEvent()` service storing to Cosmos documents container
- `GET /api/compliance/audit-log` with filters
- Wired compliance page to real API (removed DEMO_ENTRIES)

#### Phase 7: Chargeback Backend
- `getAggregatedCosts()` in cost-tracker service
- `GET /api/chargeback` endpoint
- Wired chargeback page to real API (removed DEMO_ENTRIES)

#### Phase 8: Persist State to Cosmos
- Write-through cache pattern: in-memory Map + async Cosmos upsert
- `getXSync()` fallback methods for callback contexts
- Applied to: conversation, remediation, cost-tracker, orchestrator, budget-monitor

#### Phase 9: Spec Validation Panel
- `ValidationPanel.tsx` with schema check, policy check, budget estimate
- `WorkflowProgressBar.tsx` (Drafting → Human Review → Validating → Frozen)
- `POST /api/specs/:specId/validate` endpoint
- 3-panel layout on spec page (Chat 35% / Editor 40% / Validation 25%)

#### Phase 10: WF3 Fixer Loop
- Orchestrator spawns Fixer agent on Verifier FAIL (max 3 retries)
- `FixerDiffView.tsx` with approve/reject buttons
- `POST /:runId/approve-fix` and `POST /:runId/reject-fix` endpoints

#### Phase 11: WF5 Healing + WF6 Delta API
- `POST /api/specs/:specId/delta` endpoint (uses existing delta engine)
- `healing-engine.ts` with failure clustering and auto-heal project creation
- Auto-heal trigger in orchestrator `completeRun()`

#### Phase 12: WF7 Knowledge + WF8 GitHub Actions
- `knowledge-store.ts` with pattern recording and similarity search
- `GET/POST /api/knowledge/patterns`, `POST /api/knowledge/search`
- `github-actions.ts` route for dispatch and run listing
- Real GitHub webhook handlers (replaced console.log stubs)

### Integration & Runtime Fixes
- **Dockerfile**: Added missing `packages/github-app/` copy
- **Biome**: Added `.claude` and `.vscode` to ignore list, fixed import ordering
- **Cosmos**: Created `projects` container in Azure via `createIfNotExists`
- **Azure OpenAI**: User deployed `gpt-4o` model in Azure AI Foundry
- **SpecActions.tsx**: Added "Generate Plan & Execute" button with correct API contracts:
  - `POST /api/plans/generate` with `{ specId, runId, projectId }`
  - `POST /api/authorize` with `{ runId, budgetCeiling: 50 }`
  - `POST /api/execution/start` with `{ runId }`

## Prior Sessions Summary

- **Sessions 1–4**: S1-001 through S10-002 — ALL COMPLETE (26 tasks)
- **Session 5**: Visual animations (16 keyframes, 11 components) + document overhaul
- **Session 6**: S11 Failure Intelligence (5 tasks) + Demo wiring (7 tasks)
- **Session 7**: UI redesign (30+ components) + env fix + enterprise planning (20 tasks defined)
- **Session 8**: ALL enterprise streams implemented (15/18 tasks, 2 deferred, +87 tests)
- **Session 9**: Production migration + full Azure deployment (live API + Web)
- **Sessions 10–11**: All 12 gap resolution phases + integration fixes + E2E testing started

## What To Pick Up Next

### Immediate (Session 12)
1. **Commit staged changes from VS Code** — CI/CD fixes + SpecActions button fix
2. **Test Spec→Plan→Execute flow** — Create project → chat → generate spec → accept → freeze → click "Generate Plan & Execute" → verify run dashboard populates
3. **Verify run dashboard** — Task DAG, agent cards, action stream, budget bar should show real data
4. **Add "Runs" navigation** — Consider adding a runs list page per project (currently Run tab only appears when viewing a specific run)
5. **Demo recording** — 7 workflow demonstrations
6. **Submission package** — README, architecture diagram, demo video

### What's Deferred (OK to skip)
- **S16-004: Azure SignalR migration** — Socket.IO works; migration is mechanical
- **S16-005: Application Insights SDK** — OTel spans already provide instrumentation

## Staged But Uncommitted Changes
The following changes are staged and ready to commit from VS Code:
- `biome.json` — Added `.claude` and `.vscode` to ignore
- `apps/api/Dockerfile` — Added github-app package copy
- `apps/api/src/index.ts` — Fixed import ordering
- `apps/web/components/spec/SpecActions.tsx` — Fixed API contracts for plan/authorize/execute
- Various files auto-formatted by `biome check --fix`

## Type Gotchas (Learned the Hard Way)
- `FailedStep.name` (not `stepName`)
- `PlanTask.description` (not `title`)
- `AuditOutcome = "ALLOWED" | "DENIED" | "WARNING"` (not "success"/"failure")
- `logAuditEvent()` takes `LogAuditEventParams` (action, outcome, details), not full `AuditLogEntry`
- `GitHubAppConfig.appId` is `string` (not number)
- `createOctokitClient` needs `{ appId, privateKey, installationId, owner, repo }`

## Azure Resources (Production)
| Resource | Name | Status |
|----------|------|--------|
| Resource Group | `blueflame-rg` | Active |
| Cosmos DB | `blueflame-cosmos-dev` (8 containers + projects) | Active |
| Container Apps Env | `blueflame-cae-dev` | Active |
| Container App (API) | `blueflame-api-dev` | Running |
| Container App (Web) | `blueflame-web-dev` | Running |
| Container Registry | `blueflamecr.azurecr.io` | Active |
| Log Analytics | `blueflame-logs-dev` | Active |
| App Insights | Connected | Active |
| OpenAI | `blueflame-openai-dev` (gpt-4o deployed) | Active |

## Key Files Reference
- `Blueflame-Spec-v3-ACAR.md` — Source of truth
- `docs/STATUS.md` — Sprint progress dashboard
- `docs/EXECUTION-PLAN-GAP-RESOLUTION.md` — 12-phase gap resolution plan (all complete)
- **DB Singleton**: `apps/api/src/db.ts` (lazy getters, 9 Cosmos repos)
- **Auth**: `apps/api/src/middleware/auth.ts` (Entra + dev bypass)
- **DevAuth**: `apps/web/components/auth/DevAuthProvider.tsx`
- **API Client**: `apps/web/lib/api-client.ts` (apiGet/apiPost/apiPut with dev role header)
- **SpecActions**: `apps/web/components/spec/SpecActions.tsx` (plan→authorize→execute flow)
- **Orchestrator**: `apps/api/src/services/orchestrator.ts` (run state, events, fixer loop, auto-heal)
- **Knowledge Store**: `apps/api/src/services/knowledge-store.ts`
- **Healing Engine**: `apps/api/src/services/healing-engine.ts`
- **Dockerfile (API)**: `apps/api/Dockerfile`
- **Dockerfile (Web)**: `apps/web/Dockerfile`
- **Deploy**: `.github/workflows/deploy.yml`

## Test Counts
| Scope | Count |
|-------|-------|
| apps/api | 235 |
| apps/web | 128 |
| packages/foundry | 154 |
| packages/cosmos | 44 |
| packages/shared | 28 |
| packages/github-app | 24 |
| **Total** | **613** |

## Warnings for Next Tool
- `packages/shared` must be built before dependent packages (`npx turbo build`)
- PlanLock is immutable — never modify existing locks
- Biome auto-fix needed after creating new files (`npx biome check --fix .`)
- CSS uses custom properties (`--bg-primary`, `--accent`, etc.) — not direct Tailwind colors
- `dotenv` loads `.env` from repo root in API via `import.meta.dirname`
- `db.ts` uses lazy getters — Cosmos client initializes on first access, NOT at import time
- Docker build context is repo root, Dockerfile at `apps/api/Dockerfile`
- ACR admin credentials are persistent; GHCR tokens are ephemeral (don't use GHCR)
- On Windows/MSYS: use `MSYS_NO_PATHCONV=1` prefix for az CLI commands with `/` paths
- Express route ordering: static routes before catch-all `/:id` routes
- Authorize endpoint requires `Blueflame_Authorizer` role (dev mode: set `X-Dev-Role` header)
- **Licensing**: BSL 1.1 — treat as commercially owned, not open source
