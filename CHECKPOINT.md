# Blueflame — Checkpoint (Cross-Tool Handoff)

> **Purpose**: This is the handoff document between Claude Code and Codex.
> Whichever tool picks up work next MUST read this file first.
> Updated by whichever tool finishes a work session.

---

## Last Updated By
- **Tool**: Claude Code
- **Date**: 2026-02-18
- **Session**: 20

## Current State
- **Phase**: Demo Preparation — Plan preview added to ValidationPanel, ready for E2E testing + demo
- **Last completed task**: Session 20 — Plan preview in ValidationPanel (state lifting, plan fetch, DAG, task list, σ-estimates)
- **Next task**: E2E test all flows → demo recording → submission package
- **Branch**: `main`
- **Repo is green**: YES (full build passes — 6/6 turbo tasks, 0 lint errors)
- **CI/CD**: All changes committed and pushed
- **Known issue**: None — catalog model JSON parsing resolved (Phi-4 removed from JSON-requiring roles)
- **Live API**: `https://blueflame-api-dev.blackfield-ff30bbff.centralus.azurecontainerapps.io`
- **Live Web**: `https://blueflame-web-dev.blackfield-ff30bbff.centralus.azurecontainerapps.io`
- **Licensing**: BSL 1.1 (source-available, Murai Labs commercial ownership)

## What Just Happened (Sessions 10–20)

### Session 20: Plan Preview in ValidationPanel

**Problem**: After clicking "Generate Plan", the 3rd pane (ValidationPanel) showed validation checks and run history but zero plan data — no tasks, no DAG, no σ-estimates. The user saw only "Plan ready" text in the SpecActions bar. This was part of the spec but was missed because SpecActions managed `runId` internally with no state bridge to ValidationPanel.

**Root cause**: Sibling component data isolation. SpecActions and ValidationPanel were built in separate sessions. Each worked in isolation, but `runId` was never lifted to the parent `ProjectPage` where it could be shared.

**Fix (4 files):**
1. `apps/web/app/project/[projectId]/page.tsx` — Added `activeRunId` state, passed to SpecEditor and ValidationPanel
2. `apps/web/components/spec/SpecEditor.tsx` — Threaded `onRunIdChange` callback to SpecActions
3. `apps/web/components/spec/SpecActions.tsx` — Emits `onRunIdChange` on plan generation, existing run detection, and reset
4. `apps/web/components/spec/ValidationPanel.tsx` — New PlanPreview section:
   - Fetches plan via `GET /api/plans/:runId`
   - Summary: task count, estimated cost, estimated tokens
   - Mini DAG using existing `DAGProgress` component
   - Task list: ID, description, σ-estimate (color-coded), agent role, cost, dependencies
   - σ color-coding: green (< 0.3 routine), blue (0.3–0.7 standard), purple (> 0.7 complex)

**Lesson learned**: Added to MEMORY.md — after building any component that produces state, always ask "which sibling component needs this data?"

**Tests**: All 128 web tests pass. Typecheck clean. No new lint errors.

#### Admin Task Override (same session)

**Problem**: Tasks like TASK-007/008 fail permanently because they require test frameworks that don't exist in the project context. Retry + fixer loop can't help — the verifier re-fails on the same missing prerequisite. User tried adding guidance via fixer reject, but the agent loop has no concept of "skip this."

**Fix (3 files):**
1. `apps/api/src/services/orchestrator.ts` — New `overrideTask()` function: sets FAILED/DEFERRED task to COMPLETED with admin override note, clears pending fixes, re-triggers `executeNextWave()` to unblock dependents
2. `apps/api/src/routes/execution.ts` — `POST /api/execution/:runId/override-task` with `requireRole("Blueflame_Admin")`, logs governance audit event
3. `apps/web/app/project/[projectId]/run/[runId]/page.tsx` — Purple "Override" button per failed task, visible only to Admin role users. Uses `useRole()` hook for RBAC check.

**Key design decisions:**
- Admin-only (RBAC enforced server-side + UI hidden for non-admins)
- Audit trail: logged as `GOVERNANCE` event in compliance dashboard
- Task marked COMPLETED (not DEFERRED) so dependents proceed
- `failureReason` prefixed with `[ADMIN OVERRIDE by <user>]` for traceability
- Run auto-advances: `executeNextWave()` called to unblock downstream tasks

**Tests**: All 128 web + 242 API tests pass. Typecheck clean.

### Session 19: Orchestrator Workflow Fixes + Model Routing Stabilization

Diagnosed and fixed workflow stalling (runs completing with only 1/9 tasks done). Root cause: 3 orchestrator bugs + Phi-4 JSON parsing failures.

**5 Orchestrator Fixes:**
1. **Auto-approve fixer fixes** — Removed human approval gate that stalled tasks indefinitely. Fixer now auto-spawns Verifier after completing a fix.
2. **Unreachable task deferral** — Added `getUnreachableTasks()` to detect PENDING tasks blocked by failed dependencies (transitive cascade). These get deferred instead of causing deadlock.
3. **Model escalation on retries** — Forces gpt-4o-mini for verifier re-verify and fixer retry 2+. Prevents routing failures from compounding.
4. **providerConfig.model mismatch** — When overriding `decision.model` for escalation, `decision.providerConfig.model` wasn't updated. Fixed by spreading providerConfig and overriding model in both places.
5. **Healing engine dedup** — `createHealingProject()` now checks for existing healing project before creating a new one. Prevents dashboard spam.

**Model Routing Fix:**
- Removed Phi-4 from all JSON-requiring roles (Builder, Verifier, Fixer, Planner Routine). Phi-4 kept only for Explainer (prose output).
- All JSON-requiring roles now use gpt-4o-mini at Routine tier.

**UX Fix:**
- Dashboard scrollbar: added `overflow-y-auto` to `<main>` element in `layout.tsx`.

**Tests:**
- 7 new unit tests for `getUnreachableTasks` (empty, direct, transitive, mixed, only-pending, all-terminal, diamond)
- All 242 API + 170 Foundry + 128 Web tests pass (540+ total)

**Verification:**
- Clean test run `run-clean-test-1`: 6/8 tasks COMPLETED, 0 JSON parsing failures. Only TASK-006/007 failed legitimately (need real CI data).

**Files changed:** 18 modified + 2 new (utils/ dir + smoke test script)

### Session 18b: Azure AI Foundry Multi-Model Routing

Upgraded Azure OpenAI resource to Azure AI Foundry. Deployed 3 new models (Phi-4, Llama-3.3-70B-Instruct, o3-mini) alongside existing gpt-4o and gpt-4o-mini. Updated σ-router to use 7 models across 2 active providers.

**Key changes:**
1. **Model registry** — New routing table: Phi-4 (Routine tier), Llama-3.3-70B (Standard Builder/Fixer), o3-mini (Complex Verifier/Planner), gpt-4o/gpt-4o-mini (Standard/Complex), Claude Sonnet 4.5 (Complex when Anthropic key set)
2. **Lazy initialization** — Fixed ESM import hoisting bug: `initDefaults()` was running at module load before `dotenv.config()`, making env vars empty. Now uses `ensureInitialized()` pattern.
3. **Dual API pattern** — OpenAI models use `{endpoint}/openai/deployments/{name}` + api-version query; catalog models use `{resource}/openai/v1/` with NO api-version (model in request body). New helpers: `getAzureBaseURL()`, `getAzureDefaultQuery()`, `isOpenAIModel()`.
4. **All 7 agents + provider updated** — builder, verifier, designer, planner, explainer, fixer, spec-generator, azure-openai provider all use new helpers.
5. **Biome CI fix** — Changed lint script to `--diagnostic-level=error` so warnings don't block CI. Fixed 4 SVG accessibility errors and 2 missing hook deps.

**Known issue:** Catalog models (Phi-4, Llama) return markdown instead of JSON when asked for structured output. Need to add explicit JSON format instructions to system prompts or use `response_format: { type: "json_object" }`.

**Commits:** 6 commits pushed to main (lint fix, model registry, lazy init, api-version updates, agent URL fixes).

### Session 18: Microsoft Visibility Features (Hackathon Polish)

6 features to make Microsoft service integration visible throughout all workflows:

1. **MicrosoftServicesStrip** — Persistent status bar below nav showing 6 connected Azure services with green status dots. Expandable for full service names. Polls `/health` endpoint.
2. **CreateProjectDialog rewrite** — 3-step flow: Details → Infrastructure Selection (Azure [RECOMMENDED] vs Local) → Provisioning Animation (6 services connect sequentially with spinners and checkmarks).
3. **Azure OpenAI branding on agents** — Agent status cards show "Azure" prefix before model name. DAG nodes show "Azure OpenAI" label below task ID.
4. **AzureToastProvider + toast notifications** — React Context for slide-in toast notifications. Wired into SpecEditor (spec generation, freeze) and SpecActions (plan generation, authorization, execution start). Each shows which Azure service was used.
5. **AzureServiceUsagePanel** — Collapsible panel on run dashboard showing Azure service invocations: OpenAI (tokens), Cosmos DB (persistence ops), SignalR (events), Entra ID (auth), App Insights (telemetry).
6. **Landing page feature cards** — Updated from 3 generic cards to 6 MS-branded cards (Azure OpenAI Agents, Cosmos DB, Entra ID + RBAC, GitHub Actions CI/CD, SignalR Real-time, App Insights).

**New files:** `MicrosoftServicesStrip.tsx`, `AzureToastProvider.tsx`, `AzureServiceUsagePanel.tsx`
**Modified:** `CreateProjectDialog.tsx`, `AgentStatusCard.tsx`, `DAGProgress.tsx`, `DashboardLayout.tsx`, `SpecActions.tsx`, `SpecEditor.tsx`, `page.tsx` (home), `layout.tsx`, `globals.css`

### Session 17f: Auto-init budget on run start + checkBudget after cost recording

Budget was never initialized because the user was never asked to set one. Fixed:
- `startExecution()` now auto-calls `initBudget()` with 3x estimated task costs (min $5)
- `GET /api/budget/:runId` auto-inits with $10 default if not found (no more 404)
- `checkBudgetThresholds()` called after every `recordCost()` so spend updates in real-time

### Session 17e: Wire cost tracking + failure recording + audit log startup

Three data gaps that caused empty dashboards:
1. **Chargeback empty**: `recordCost()` was never called from the orchestrator. Now called in both `completeTask()` and `failTask()` with agent model + token counts.
2. **Failures empty**: `storeFailure()` was only wired to webhook handlers, not agent failures. Now called in `failTask()` to record agent failures as `NormalizedFailure` documents in Cosmos.
3. **Audit log lost on restart**: `memoryBuffer` started empty each session. Added `loadAuditLogFromCosmos()` that loads last 500 entries on startup. Also loads cost entries via `loadCostEntriesFromCosmos()`.

### Session 17d: PAT-based GitHub auth for deployment

Simplified GitHub auth for deployment workflow. Instead of requiring full GitHub App setup (5 env vars), users can now just set `GITHUB_TOKEN` (a Personal Access Token) + `GITHUB_OWNER` + `GITHUB_REPO`. PAT auth takes priority; falls back to GitHub App if no token set. Updated PostRunActionsPanel fallback message to show PAT as the simplest option.

### Session 17c: Builder retry constraint injection

When `retryFailedTasks()` re-runs a failed task, the builder received the exact same input and produced the same failure. Now on retry, the task's previous `failureReason` is injected as a RETRY constraint telling the builder to make reasonable default choices instead of refusing (e.g., pick React Native if spec doesn't specify mobile framework).

### Session 17b: Fix SCR Delta Execution + Retry Bugs

Three bugs prevented runs from restarting after SCR delta or retry:

1. **`retryFailedTasks()` and `applyTaskPatch()` used `runs.get()` (cache only)** — if API restarted, run not in memory → "Run not found". Fixed: use `getRun()` with Cosmos fallback.
2. **`applyTaskPatch()` rejected EXECUTING runs** — if user retried first (sets EXECUTING), then SCR delta execute failed with "must be COMPLETED/PARTIAL/PAUSED". Fixed: accept EXECUTING status, interrupt running tasks first.
3. **`executeNextWave()` used `runs.get()` (cache only)** — same cache-miss problem. Fixed: use `getRun()`.
4. **`applyTaskPatch()` was sync but needed async** — now returns `Promise<Result<void>>`, callers updated.

### Session 17: Post-Execution Deployment Workflow + Session 16 UX Fixes

**Commit 1 — Deployment Workflow (`6955a02`):**
Full post-run deployment pipeline: commit task outputs to GitHub → monitor CI → trigger deploy.

- `packages/shared/src/types/deployment.ts` — **New** — `DeploymentStep`, `DeploymentState` types
- `apps/api/src/services/deployment-service.ts` — **New** — `syncToGitHub()`, `getCIStatus()`, `triggerDeploy()`
- `apps/api/src/routes/deployment.ts` — **New** — 3 API routes (POST sync, GET ci-status, POST deploy)
- `apps/web/components/deployment/PostRunActionsPanel.tsx` — **New** — container component for step machine
- `apps/web/components/deployment/GitHubSyncSection.tsx` — **New** — commit message editor + push button
- `apps/web/components/deployment/CIStatusPanel.tsx` — **New** — live CI polling + deploy button
- `apps/api/src/services/orchestrator.ts` — Added `deploymentState` to `RunState`, `updateDeploymentState()`
- `apps/api/src/routes/execution.ts` — Include `deploymentState` in GET response
- `apps/api/src/index.ts` — Register deployment router
- `apps/web/app/project/[projectId]/run/[runId]/page.tsx` — Mount `PostRunActionsPanel` when run complete

**Commit 2 — Session 16 UX Fixes (`a968b71`):**
Previously uncommitted work from Session 16: fixer workflow improvements, run history, DAG interaction.

- `apps/api/src/routes/projects.ts` — Added `GET /:projectId/runs` route
- `apps/api/src/services/scr-service.ts` — SCR delta: set AUTHORIZED (not auto-execute)
- `apps/api/src/services/task-executor.ts` — Fixer context injection (original code + failure reason)
- `apps/web/components/dashboard/DAGProgress.tsx` — Clickable DAG nodes with selection highlighting
- `apps/web/components/dashboard/FixerDiffView.tsx` — Proper state detection, user guidance textarea
- `apps/web/components/spec/SpecActions.tsx` — Restore state from server on mount, View Run / New Run
- `apps/web/components/spec/RunHistory.tsx` — **New** — Run history with status badges, 10s auto-refresh
- `apps/web/components/spec/ValidationPanel.tsx` — Integrated RunHistory, accepts projectId
- Plus: DashboardLayout, RunDashboardPanes, DeltaImpactMap, SCRPanel, SpecEditor.test updates

### Session 16: Spec Viewer on Run Dashboard

Added a read-only spec viewer to the run dashboard so users can reference the frozen spec while watching execution.

**Changes:**
- `apps/api/src/routes/execution.ts` — Added `projectId` + `specId` to GET `/:runId` response
- `apps/web/components/spec/SpecViewerPanel.tsx` — **New** — read-only YAML viewer with frozen badge, SCR guidance banner, and "Go to Project" link
- `apps/web/app/project/[projectId]/run/[runId]/page.tsx` — "View Spec" / "Hide Spec" toggle button in header bar, collapsible SpecViewerPanel

### Session 15: Workflow Failure UX Improvements

Three UX issues identified during real user testing of the run dashboard were fixed:

**Fix 1: FixerDiffView loading state**
- When fixer agent is working (`fixedCode` empty), shows pulse spinner + shimmer placeholder instead of empty panel
- Approve/Reject buttons hidden until fix is ready

**Fix 2: Error reason surfacing**
- Added `failureReason?: string` to `PlanTask` type
- Orchestrator `failTask()` now sets `task.failureReason` from error message
- `AgentStatusCard` shows 2-line red error text when FAILED (with tooltip for full text)
- Failed tasks banner shows actual error reason instead of truncated description

**Fix 3: Run completion notification**
- Prominent inline banner when run transitions to PARTIAL (red, 10s auto-dismiss) or COMPLETED (green, 5s auto-dismiss)
- Dismiss button for manual close

**Process improvement:**
- Added mandatory rule to CLAUDE.md: always update STATUS.md + CHECKPOINT.md before committing and pushing

### Session 14: UX Bug Fixes from Real User Testing

User tested the full Spec→Plan→Execute and SCR flows and found 11 issues. All fixed:

**Execution flow (SpecActions)**:
- Broke one-click "Generate Plan & Execute" into 3 discrete steps: Generate Plan → Approve & Lock → Start Execution
- Each step has its own button, loading state, and Cancel option

**Stop execution**:
- Added 3 interrupt checkpoints in orchestrator (between task spawns, before Verifier spawn, before Fixer spawn)
- Previously only checked at top of `executeNextWave()`

**Dev banner overlay**:
- Removed `sticky top-0 z-50` from dev mode banner — was overlaying NavHeader (z-40)

**Project stats (0 specs, 0 runs)**:
- Added `incrementProjectStat()` — called after spec creation (specCount++) and run start (runCount++)

**SCR delta detection (0 changes)**:
- `detectChanges()` only compared structured fields (acceptanceCriteria, deliverables) which are always empty arrays
- Added content-level comparison fallback: compares raw YAML `content` field when structured fields detect nothing
- `computeTaskImpacts()` now marks all tasks as REBUILD on content-level changes

**Failed task UX**:
- `fail-task` route now passes `originalCode`, `errorMessage`, `failingRole` to orchestrator
- New `retryFailedTasks()` function: resets FAILED→PENDING, clears retry counts, resumes execution
- New `POST /api/execution/:runId/retry-failed` endpoint
- Run dashboard: PARTIAL badge shows "N tasks failed", amber banner lists failed tasks, Retry button

**CI fixes**:
- Biome formatting auto-fix on SpecActions, SCRPanel, ChatPanel

### Session 12–13: SCR Governance + Delta Execution + Docs

Implemented the Spec-Freeze Doctrine: frozen specs can only be changed via formal Spec Change Requests (SCRs). Full workflow: create SCR → automatic DiffPack + impact analysis → approve/reject → delta execution (patch existing plan, re-execute only affected tasks). 14 files changed, ~1538 lines added. All documentation updated.

**New files:**
- `packages/shared/src/types/scr.ts` — SCR types (SCRStatus, DiffPack, TaskPatch, BaselineSnapshot)
- `apps/api/src/services/scr-service.ts` — Core SCR logic (create, analyze, approve, reject, delta execute)
- `apps/api/src/routes/scr.ts` — 6 REST endpoints for SCR workflow
- `apps/web/components/spec/SCRPanel.tsx` — Multi-step SCR UI (edit → review → approve → execute)

**Modified files:**
- `apps/api/src/services/orchestrator.ts` — Added `applyTaskPatch()` for delta execution
- `apps/api/src/services/task-executor.ts` — Patch Mode agent constraints
- `apps/web/components/chat/ChatPanel.tsx` — SCR integration when frozen
- `apps/web/app/project/[projectId]/page.tsx` — Pass frozen spec props

### Sessions 10–11: Gap Resolution — All 12 Phases Complete

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
- **Sessions 12–13**: SCR governance + delta execution feature + documentation updates
- **Session 14**: UX bug fixes from real user testing (11 issues fixed)
- **Session 15**: Workflow failure UX improvements (loading state, error surfacing, completion banner)
- **Session 16**: Spec viewer on run dashboard (API response, SpecViewerPanel, toggle)
- **Session 17**: Post-execution deployment workflow + Session 16 UX fixes committed
- **Session 18**: Microsoft visibility features (6 features for hackathon wow factor)
- **Session 18b**: Azure AI Foundry multi-model routing (7 models, dual API pattern, lazy init fix)
- **Session 19**: Orchestrator workflow fixes (5 bugs), model routing stabilization, healing dedup, scrollbar fix
- **Session 20**: Plan preview in ValidationPanel (state lifting, DAG, task list, σ-estimates)

## What To Pick Up Next

### Immediate (Session 20)
1. **E2E test all flows** — Spec→Plan→Execute, SCR, failure→fix→approve — verify with live API
2. **Demo recording** — 7 workflow demonstrations (WF1-WF7)
3. **Submission package** — README (done), architecture diagram, demo video

### What's Deferred (OK to skip)
- **S16-004: Azure SignalR migration** — Socket.IO works; migration is mechanical
- **S16-005: Application Insights SDK** — OTel spans already provide instrumentation

## Staged But Uncommitted Changes
None — all changes committed and pushed.

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
| AI Foundry | `blueflame-openai-dev` (gpt-4o, gpt-4o-mini, o3-mini, Phi-4, Llama-3.3-70B) | Active |

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
- **SCR Service**: `apps/api/src/services/scr-service.ts` (create, analyze, approve, delta execute)
- **SCR Panel**: `apps/web/components/spec/SCRPanel.tsx` (multi-step governance UI)
- **Dockerfile (API)**: `apps/api/Dockerfile`
- **Dockerfile (Web)**: `apps/web/Dockerfile`
- **Deploy**: `.github/workflows/deploy.yml`

## Test Counts
| Scope | Count |
|-------|-------|
| apps/api | 242 |
| apps/web | 128 |
| packages/foundry | 170 |
| packages/cosmos | 44 |
| packages/shared | 28 |
| packages/github-app | 24 |
| **Total** | **636** |

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
- Catalog models (Phi-4, Llama) use `/openai/v1/` path with NO api-version; OpenAI models use `/openai/deployments/{name}` with api-version. Phi-4 removed from JSON-requiring roles (only used for Explainer prose).
- ESM import hoisting: never call functions that read `process.env` at module load time — use lazy initialization
- Authorize endpoint requires `Blueflame_Authorizer` role (dev mode: set `X-Dev-Role` header)
- **Licensing**: BSL 1.1 — treat as commercially owned, not open source
