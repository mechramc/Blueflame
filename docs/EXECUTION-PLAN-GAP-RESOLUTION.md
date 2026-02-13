# Blueflame: Systematic Gap Resolution Plan

> **Created**: 2026-02-12
> **Status**: Approved for execution
> **Scope**: 13 critical gaps between current state and enterprise-grade product
> **Source**: QA audit `docs/qa/qa-audit-2026-02-12.md` + image refs comparison

## Context

Blueflame is a governed AI software refinery. The packages (shared, cosmos, foundry, github-app) are solid production-quality code. Individual UI components are well-built. But the integration layer is broken: the home page is a "Seed Demo Data" button, auth exists but is never activated, the run dashboard receives mismatched data and renders empty, enterprise pages show hardcoded arrays, navigation hides pages, all runtime state is lost on restart, and 4 of 7 workflows are not implemented.

This plan addresses all 13 gaps systematically, ordered by dependency. No shortcuts. Every phase has a browser-verifiable outcome.

---

## Gap Summary

| # | Gap | Severity |
|---|-----|----------|
| 1 | Home page is a seed-data launcher, not a projects hub | CRITICAL |
| 2 | Auth not wired (layout + API + middleware) | CRITICAL |
| 3 | Run dashboard API contract mismatch → empty dashboard | CRITICAL |
| 4 | Spec page missing validation panel + budget widget | HIGH |
| 5 | Compliance dashboard is demo data only | HIGH |
| 6 | Chargeback dashboard is demo data only | HIGH |
| 7 | Navigation doesn't expose enterprise pages | MEDIUM |
| 8 | In-memory state lost on restart | HIGH |
| 9 | WF3 Build-to-Verify — no interactive fix-and-rerun | HIGH |
| 10 | WF5 Autonomous Healing — not implemented | HIGH |
| 11 | WF6 Spec Delta Detection — engine exists, not wired | HIGH |
| 12 | WF7 Knowledge Integration — not implemented | HIGH |
| 13 | WF8 GitHub Actions — webhook is a stub | HIGH |

---

## Dependency Graph

```
Phase 1 (Auth Wiring) ──────────────┐
Phase 2 (Projects Container + API) ──┤
                                      ├─> Phase 3 (Dynamic Home Page)
                                      ├─> Phase 4 (Run Dashboard API Fix)
                                      ├─> Phase 5 (Navigation)
Phase 4 ──────────────────────────────┼─> Phase 6 (Compliance Backend)
                                      ├─> Phase 7 (Chargeback Backend)
                                      ├─> Phase 8 (Persist State to Cosmos)
Phase 8 ──────────────────────────────┤
                                      ├─> Phase 9 (Spec Validation Panel)
                                      ├─> Phase 10 (WF3 Fixer Loop)
                                      ├─> Phase 11 (WF5 Healing + WF6 Delta)
                                      └─> Phase 12 (WF7 Knowledge + WF8 GitHub)
```

---

## PHASE 1: Auth Wiring + Dev Role Picker (GAP 2)

**Why first**: Every subsequent phase needs `req.user` on the API and authenticated context in the frontend. Dev role picker enables testing RBAC gating without Azure Entra credentials.

### Design Decision
- **Dev mode**: When `ENTRA_TENANT_ID` / `NEXT_PUBLIC_ENTRA_CLIENT_ID` are NOT set, show a dev-mode role picker screen where you select which role to simulate (Viewer / Editor / Authorizer / Admin)
- **Production mode**: When Entra vars ARE set, use real MSAL JWT flow
- **API side**: Dev bypass header `X-Dev-Role` sets the role; when Entra vars not set, API trusts this header

### Files to Modify

| File | Action | What Changes |
|------|--------|-------------|
| `apps/api/src/middleware/auth.ts` | MODIFY | Add dev bypass: if `ENTRA_TENANT_ID` is not set, read `X-Dev-Role` header (default: "Blueflame_Admin"). Inject dev user with that role into `req.user`. |
| `apps/api/src/index.ts` | MODIFY | Apply `app.use("/api", authenticate)` BEFORE all route registrations. Keep `/health` above. |
| `apps/api/src/routes/authorize.ts` | MODIFY | Add `requireRole(UserRole.Authorizer)` to POST handler. Read `authorizedBy` and `userRoles` from `req.user` instead of `req.body` (eliminate role spoofing). |
| `apps/web/app/layout.tsx` | MODIFY | Conditionally wrap children with `<AuthProvider>` when `NEXT_PUBLIC_ENTRA_CLIENT_ID` is set. Otherwise wrap with `<DevAuthProvider>`. |
| `apps/web/components/auth/AuthProvider.tsx` | MODIFY | If `msalConfig.auth.clientId` is empty/placeholder, render children directly without MsalProvider. |
| `apps/web/components/auth/DevAuthProvider.tsx` | CREATE | Dev-mode context provider. Stores selected role in state + localStorage. Provides `devRole`, `setDevRole`, `devUser` via React context. Shows persistent role picker dropdown in a top banner. |
| `apps/web/lib/api-client.ts` | CREATE | Authenticated fetch wrapper. In prod mode: acquires MSAL token, sets `Authorization: Bearer` header. In dev mode: sets `X-Dev-Role` header from DevAuth context. Exports `apiGet(path)`, `apiPost(path, body)`, `apiPut(path, body)`. |
| `apps/web/hooks/useApiClient.ts` | CREATE | React hook wrapping `api-client.ts` with MSAL or DevAuth context. |
| `apps/web/hooks/useRole.ts` | MODIFY | In dev mode: read role from DevAuth context instead of MSAL claims. |
| `apps/web/middleware.ts` | MODIFY | If `NEXT_PUBLIC_ENTRA_CLIENT_ID` not set, always `NextResponse.next()`. |

### Verification
1. Start API with NO Entra env vars → `GET /api/health` returns 200, `GET /api/specs/demo-project-1` returns data (not 401)
2. Start web → yellow "Dev Mode" banner with role picker dropdown visible at top
3. Select "Viewer" role → Authorize button should be disabled. Select "Authorizer" → button enables.
4. All existing pages still load without errors

---

## PHASE 2: Projects Container + CRUD API (GAP 1 foundation)

**Why**: Home page needs real project data. Every other page references `projectId`. Projects must be first-class Cosmos entities.

### Design Decision
- Partition key: `/id` (single-tenant, simpler)
- Future expansion to multi-tenant (`/orgId`) and portfolio levels documented in README and Bicep comments

### Files to Create/Modify

| File | Action | What Changes |
|------|--------|-------------|
| `packages/shared/src/types/project.ts` | CREATE | `Project` interface: `id, name, description, status ("active"/"archived"/"completed"), createdBy, createdAt, updatedAt, specCount, runCount, lastActivityAt`. Note: partitioned by `/id` (single-tenant). README documents future expansion path to multi-tenant (`/orgId`) and portfolio levels. |
| `packages/shared/src/index.ts` | MODIFY | Re-export `Project` type |
| `packages/cosmos/src/config.ts` | MODIFY | Add `projects: "projects"` to `CONTAINERS` |
| `packages/cosmos/src/repositories/projects.ts` | CREATE | `ProjectsRepository` extending `Repository<Project>`. Methods: `findAll()`, `search(query)`. Partition key: `/id`. |
| `packages/cosmos/src/index.ts` | MODIFY | Re-export `ProjectsRepository` |
| `apps/api/src/db.ts` | MODIFY | Add lazy getter for `db.projects` |
| `apps/api/src/routes/projects.ts` | CREATE | `GET /`, `GET /:projectId`, `POST /` (requireRole Editor), `PUT /:projectId`, `DELETE /:projectId` (soft archive). Zod validation on bodies. |
| `apps/api/src/index.ts` | MODIFY | Register `projectsRouter` at `/api/projects` |
| `infra/modules/cosmos.bicep` | MODIFY | Add `projects` container (partitionKey: `/id`). Add comment: `// Future: migrate to /orgId for multi-tenant and portfolio-level partitioning` |
| `apps/api/src/routes/demo-seed.ts` | MODIFY | Also create a Project document when seeding |

### Verification
1. `POST /api/projects` with `{ "name": "Backend Refactor v3", "description": "Migrate auth module" }` → 201
2. `GET /api/projects` → returns array with the created project
3. `GET /api/projects/{id}` → returns the project

---

## PHASE 3: Dynamic Home Page (GAP 1 completion)

**Why**: The home page is the first thing anyone sees. It must show real projects, not a seed button.

### Files to Create/Modify

| File | Action | What Changes |
|------|--------|-------------|
| `apps/web/app/page.tsx` | REWRITE | Fetch from `GET /api/projects`. Render project cards with name, description, status badge, counts. "New Project" button opens creation dialog. Search input. Empty state when no projects. Remove seed button entirely. |
| `apps/web/components/projects/ProjectCard.tsx` | CREATE | Single project card: status dot, name, description, spec/run counts, quick links to `/project/{id}`, `/project/{id}/failures`. |
| `apps/web/components/projects/CreateProjectDialog.tsx` | CREATE | Modal with form (name, description). POSTs to `/api/projects`. On success, refreshes list. |
| `apps/web/components/projects/ProjectStatusBadge.tsx` | CREATE | Badge: green "Active", gray "Archived", blue "Completed". |
| `apps/web/hooks/useProjects.ts` | CREATE | `useProjects()` hook: fetch/cache project list, returns `{ projects, isLoading, error, refresh, createProject }`. |

### Verification
1. Navigate to `/` → see empty state "No projects yet"
2. Click "New Project" → fill name/description → submit → project appears in list
3. Click project card → navigates to `/project/{id}` (spec page loads)

---

## PHASE 4: Run Dashboard API Contract Fix (GAP 3)

**Why**: The dashboard components are well-built but receive no data because the API returns the wrong shape. This is the highest-impact fix.

### Files to Modify

| File | Action | What Changes |
|------|--------|-------------|
| `apps/api/src/routes/execution.ts` | MODIFY | Change `GET /:runId` to return: `{ status, plan: { tasks: run.plan.tasks }, agents: agentStates, events: run.events ?? [] }`. Fetch agents from `db.agents.findByRun(runId)`. Map to `AgentCardData` shape. |
| `apps/api/src/services/orchestrator.ts` | MODIFY | Add `events: ActionEvent[]` array to `RunState`. Push events on: task spawn, agent spawn, task complete, task fail, budget warning. Export `getRunEvents(runId)`. |
| `packages/shared/src/types/action-event.ts` | CREATE | `ActionEvent` type: `{ id, runId, timestamp, agentId?, role?, type: "TASK_STARTED" | "AGENT_SPAWNED" | "TASK_COMPLETED" | "TASK_FAILED" | "BUDGET_WARNING" | "VERIFICATION_PASSED" | "VERIFICATION_FAILED", detail: string }` |
| `packages/shared/src/index.ts` | MODIFY | Re-export `ActionEvent` |
| `apps/web/app/project/[projectId]/run/[runId]/page.tsx` | MODIFY | Fix `bg-gray-50` → `bg-[--bg-primary]` (design system). No data binding changes needed — the existing code already expects the correct shape. |

### Verification
1. Start a run via API (POST /api/execution/start with valid lock)
2. Navigate to `/project/{pid}/run/{runId}`
3. See: task DAG with colored nodes, agent cards in the grid, events in the action stream, budget bar
4. Previously: all of these were empty

---

## PHASE 5: Navigation (GAP 7)

**Why**: Compliance and Chargeback pages exist but are unreachable.

### Files to Modify

| File | Action | What Changes |
|------|--------|-------------|
| `apps/web/components/layout/NavHeader.tsx` | MODIFY | Add enterprise links section on the right side (before connection indicator): Compliance, Chargeback. Visual separator between breadcrumbs and enterprise links. |

### Verification
1. Any page → see "Compliance" and "Chargeback" links in nav header
2. Click each → navigates to correct page

---

## PHASE 6: Compliance Dashboard Backend (GAP 5)

**Why**: Replace hardcoded DEMO_ENTRIES with real audit data.

### Files to Create/Modify

| File | Action | What Changes |
|------|--------|-------------|
| `packages/shared/src/types/audit.ts` | CREATE | `AuditLogEntry` type (reuse interface from compliance page but as shared type) |
| `packages/shared/src/index.ts` | MODIFY | Re-export `AuditLogEntry` |
| `apps/api/src/services/audit-logger.ts` | CREATE | `logAuditEvent(entry)` stores to `db.documents` (type: "audit-log"). `queryAuditLog(filters)` queries with eventType/outcome/search/date filters. |
| `apps/api/src/routes/compliance.ts` | CREATE | `GET /api/compliance/audit-log` with query params for filters. Returns `{ entries, total }`. |
| `apps/api/src/index.ts` | MODIFY | Register compliance router |
| `apps/web/app/compliance/page.tsx` | MODIFY | Replace `DEMO_ENTRIES` with fetch from API. Add loading/error states. Import `AuditLogEntry` from `@blueflame/shared`. |
| `apps/api/src/services/orchestrator.ts` | MODIFY | Import `logAuditEvent`. Log on: run start (AUTH), agent spawn (AGENT), budget threshold (BUDGET), task completion (AGENT). |
| `apps/api/src/middleware/auth.ts` | MODIFY | Log auth success/failure events via `logAuditEvent`. |

### Verification
1. Navigate to `/compliance` → initially empty (or shows auth events from page load)
2. Trigger a run → refresh → see AGENT and ROUTING events appear
3. Filters work. CSV export works with real data.

---

## PHASE 7: Chargeback Dashboard Backend (GAP 6)

**Why**: Replace hardcoded cost data with real aggregations.

### Files to Create/Modify

| File | Action | What Changes |
|------|--------|-------------|
| `packages/shared/src/types/chargeback.ts` | CREATE | `ChargebackEntry` type (reuse interface from chargeback page as shared type) |
| `packages/shared/src/index.ts` | MODIFY | Re-export |
| `apps/api/src/services/cost-tracker.ts` | MODIFY | Add `getAggregatedCosts(): ChargebackEntry[]` that groups costLog by project, then by model/role. |
| `apps/api/src/routes/chargeback.ts` | CREATE | `GET /api/chargeback` → returns `{ entries, totals: { spend, tasks } }` |
| `apps/api/src/index.ts` | MODIFY | Register chargeback router |
| `apps/web/app/chargeback/page.tsx` | MODIFY | Replace `DEMO_ENTRIES` with fetch from API. Add loading/error states. |

### Verification
1. Navigate to `/chargeback` → empty state or real data from previous runs
2. After running agents, refresh → see team/model/role cost breakdown with real numbers

---

## PHASE 8: Persist In-Memory State to Cosmos (GAP 8)

**Why**: Enterprise software cannot lose all state on server restart.

### Files to Modify

| File | Action | What Changes |
|------|--------|-------------|
| `apps/api/src/services/conversation.ts` | REWRITE | Replace `Map<>` with Cosmos `documents` container (type: "conversation"). Read/write through `db.documents`. Keep in-memory cache, flush on every write. Same public API. |
| `apps/api/src/services/remediation.ts` | REWRITE | Replace `Map<>` with Cosmos `documents` container (type: "remediation"). All state transitions persist to Cosmos. Same public API. |
| `apps/api/src/services/cost-tracker.ts` | MODIFY | On `recordCost()`, also persist to `db.documents` (type: "cost-entry"). On startup, load existing entries from Cosmos. |
| `apps/api/src/services/orchestrator.ts` | MODIFY | Checkpoint RunState to `db.runs` on every status change. On `getRun()`, fall back to `db.runs.read()` if not in memory. |
| `apps/api/src/services/budget-monitor.ts` | MODIFY | Persist budget state to `db.documents` (type: "budget-state") on every update. |
| `packages/cosmos/src/repositories/documents.ts` | MODIFY | Add `findByType(projectId, type)` helper method if not already present. |

### Verification
1. Start API. Chat with a project (creates conversation). Restart API.
2. Navigate to same project → conversation history still there
3. Same test for: remediations, budget data, run state

---

## PHASE 9: Spec Validation Panel + Workflow Bar (GAP 4)

**Why**: The image refs show a 3-panel spec page. Current is 2-panel.

### Files to Create/Modify

| File | Action | What Changes |
|------|--------|-------------|
| `apps/web/components/spec/ValidationPanel.tsx` | CREATE | Three sections: Schema Check (YAML valid?), Policy Check (constraints met?), Budget Estimate. Each shows pass/fail with detail. Props: `specId, specContent, status`. Calls `POST /api/specs/:specId/validate`. |
| `apps/web/components/spec/WorkflowProgressBar.tsx` | CREATE | Horizontal steps: Drafting → Human Review → Validating → Frozen. Active step highlighted. Props: `status: SpecStatus`. |
| `apps/api/src/routes/specs.ts` | MODIFY | Add `POST /api/specs/:specId/validate` → returns `{ schema: { valid, errors }, policy: { valid, violations }, budget: { estimatedCost } }`. |
| `apps/api/src/services/spec-validation.ts` | CREATE | `validateSpecSchema(content)` — YAML parse + Zod. `validateSpecPolicy(spec, constraints)` — constraint checks. |
| `apps/web/app/project/[projectId]/page.tsx` | MODIFY | Change from 2-panel SplitView to 3-panel layout: Chat (35%) / Spec Editor (40%) / Validation + Workflow + Budget (25%). |

### Verification
1. Navigate to `/project/{pid}` → see 3 panels
2. Type invalid YAML → validation panel shows schema errors (red)
3. Fix YAML → schema check turns green
4. Accept → Freeze → workflow progress bar updates through stages

---

## PHASE 10: WF3 Build-to-Verify Fixer Loop (GAP 9)

**Why**: The image refs show an interactive failure recovery with side-by-side diffs and "Approve Fix & Re-run".

### Files to Create/Modify

| File | Action | What Changes |
|------|--------|-------------|
| `apps/api/src/services/orchestrator.ts` | MODIFY | On Verifier FAIL: if retries < 3, spawn Fixer agent. Store fixer output in `RunState.pendingFixes`. Add retry count tracking per task. After Fixer completes, await human approval before re-spawning Verifier. |
| `apps/api/src/routes/execution.ts` | MODIFY | Add `POST /:runId/approve-fix` (approves fixer output, re-runs verifier). Add `POST /:runId/reject-fix` (marks task FAILED permanently). Return `pendingFixes` in GET response. |
| `apps/web/components/dashboard/FixerDiffView.tsx` | CREATE | Side-by-side diff showing original vs. fixed code. "Approve Fix & Re-run" and "Reject Fix" buttons. Props: `fix: PendingFix, onApprove, onReject`. |
| `apps/web/components/dashboard/DashboardLayout.tsx` | MODIFY | Render `FixerDiffView` at bottom when `pendingFixes.length > 0`. |
| `apps/web/app/project/[projectId]/run/[runId]/page.tsx` | MODIFY | Add `pendingFixes` to state. Pass to DashboardLayout. Handle approve/reject API calls. |
| `packages/shared/src/types/pending-fix.ts` | CREATE | `PendingFix` type: `{ taskId, fixerId, originalCode, fixedCode, explanation, retryCount }` |

### Verification
1. During execution, when Verifier fails a task → Fixer agent appears in agent grid
2. Diff view appears at bottom of dashboard showing original vs. fix
3. Click "Approve Fix & Re-run" → Verifier re-runs the task
4. If passes → task completes. If fails again and retries exhausted → task marked FAILED.

---

## PHASE 11: WF5 Autonomous Healing + WF6 Delta Detection API (GAP 10, 11)

**Why**: Delta detection engine exists (319 lines) but has no API endpoint. Autonomous healing is the "wow" demo feature.

### Files to Create/Modify

| File | Action | What Changes |
|------|--------|-------------|
| `apps/api/src/routes/delta.ts` | CREATE | `POST /api/specs/:specId/delta` with body `{ previousSpecId }`. Returns `DeltaAnalysis` from existing `analyzeSpecDelta()`. |
| `apps/api/src/index.ts` | MODIFY | Register delta router |
| `apps/web/components/spec/SpecActions.tsx` | MODIFY | Add "Compare with Previous" button when frozen spec has a previous version |
| `apps/web/components/spec/DeltaImpactMap.tsx` | MODIFY | Wire into spec page. Show PRESERVE/REBUILD/NEW/REMOVE task classifications. |
| `apps/api/src/services/healing-engine.ts` | CREATE | `createHealingProject(failures: NormalizedFailure[]): Promise<Project>` — analyzes systematic failures, generates a new project + spec via SpecGenerator agent, stores in Cosmos. |
| `apps/api/src/services/orchestrator.ts` | MODIFY | After run completes with failures: call `shouldAutoHeal(failures)` (checks for 3+ similar failures or infrastructure-level issues). If yes, call `createHealingProject()`. |
| `apps/api/src/routes/remediation.ts` | MODIFY | Add `POST /:remId/auto-heal` endpoint for manual trigger. |

### Verification
1. `POST /api/specs/{id}/delta` with two spec IDs → returns impact map with classifications
2. On spec page, click "Compare with Previous" → DeltaImpactMap shows color-coded changes
3. After 3 similar failures in a run, check `GET /api/projects` → new healing project created automatically

---

## PHASE 12: WF7 Knowledge Integration + WF8 GitHub Actions (GAP 12, 13)

**Why**: Completes the remaining workflows. Knowledge integration provides organizational learning via semantic similarity. GitHub Actions makes the CI/CD loop functional.

### Design Decision
- **Knowledge matching**: Semantic similarity using Foundry embeddings (not simple key-value). Each pattern gets an embedding vector stored in Cosmos. New failures are compared via cosine similarity to find relevant past resolutions.

### Files to Create/Modify

| File | Action | What Changes |
|------|--------|-------------|
| `packages/shared/src/types/knowledge.ts` | CREATE | `PatternEntry`: `{ id, pattern, context, resolution, frequency, lastUsed, projectIds, source, embedding?: number[] }` — embedding vector stored for semantic similarity search |
| `packages/foundry/src/embeddings/embed.ts` | CREATE | `generateEmbedding(text: string): Promise<number[]>` — calls Azure OpenAI embeddings endpoint (text-embedding-ada-002 or text-embedding-3-small). `cosineSimilarity(a: number[], b: number[]): number` — vector comparison utility. |
| `apps/api/src/services/knowledge-store.ts` | CREATE | Store patterns in `db.documents` (type: "pattern"). `recordPattern()`, `findSimilarPatterns(context)` using Foundry embeddings for semantic similarity matching, `getTopPatterns(limit)`. Uses `@blueflame/foundry` to generate embeddings for pattern context and compares via cosine similarity. |
| `apps/api/src/routes/knowledge.ts` | CREATE | `GET /api/knowledge/patterns`, `POST /api/knowledge/patterns`. |
| `apps/api/src/services/orchestrator.ts` | MODIFY | After successful run, extract patterns from completed tasks and store. |
| `apps/api/src/services/github-failure-normalizer.ts` | CREATE | `normalizeGitHubWorkflowRun(payload): NormalizedFailure` — same format as ADO normalizer. Extracts: workflow name, conclusion, failed jobs, failed steps, logs URL. |
| `apps/api/src/webhooks/github.ts` | MODIFY | Replace console.log stubs with real handlers: `workflow_run.completed` → normalize → store failure. `check_run.completed` → normalize → store. Use `@blueflame/github-app` `getWorkflowRunLogs()` for detailed log extraction. |
| `packages/shared/src/types/enums.ts` | MODIFY | Add `GitHub = "github-actions"` to `FailureSource` enum if not present. |
| `apps/api/src/routes/github-actions.ts` | CREATE | `POST /api/github/dispatch` — trigger workflow via `@blueflame/github-app` `triggerWorkflow()`. `GET /api/github/runs/:owner/:repo` — list recent runs. |
| `apps/api/src/index.ts` | MODIFY | Register knowledge and github-actions routers. |

### Verification
1. WF7: After a successful run → `GET /api/knowledge/patterns` returns extracted patterns with embeddings
2. WF7: Submit a new failure context → `findSimilarPatterns` returns semantically similar past resolutions
3. WF8: Configure GitHub webhook → push failing commit → failure appears on failures page with source "github-actions"
4. `POST /api/github/dispatch` with valid repo → GitHub Action triggered

---

## Execution Rules (Non-Negotiable)

1. **One phase at a time.** Do not start Phase N+1 until Phase N is verified.
2. **Verify in browser.** Every phase ends with a specific thing the user can see. Not "tests pass" — what renders on screen.
3. **No orphaned code.** Every file created must be imported, mounted, and reachable by a user.
4. **Wiring audit after each phase.** Before marking done, trace the path: API route → registered in index.ts → frontend calls it → component renders it → user can see it.
5. **Update existing files first.** Only create new files when no existing file can serve the purpose.
6. **Commit after each phase.** Each phase = one atomic commit that can be verified independently.

---

## Total Scope

| Phase | Gap(s) | New Files | Modified Files | Verification |
|-------|--------|-----------|----------------|-------------|
| 1 | GAP 2 | 3 | 7 | API works with dev bypass, role picker visible |
| 2 | GAP 1 (foundation) | 3 | 5 | Projects CRUD API functional |
| 3 | GAP 1 (UI) | 4 | 1 | Dynamic project list, creation dialog |
| 4 | GAP 3 | 1 | 3 | Run dashboard shows DAG, agents, events |
| 5 | GAP 7 | 0 | 1 | Nav links to Compliance/Chargeback |
| 6 | GAP 5 | 3 | 4 | Real audit data in compliance table |
| 7 | GAP 6 | 2 | 3 | Real cost data in chargeback page |
| 8 | GAP 8 | 0 | 6 | State survives API restart |
| 9 | GAP 4 | 3 | 2 | 3-panel spec page with validation |
| 10 | GAP 9 | 2 | 3 | Fixer loop with diff view |
| 11 | GAP 10, 11 | 2 | 4 | Delta API + auto-healing |
| 12 | GAP 12, 13 | 5 | 4 | Knowledge store + GitHub normalization |
| **TOTAL** | **13 gaps** | **~28 new** | **~43 modified** | **12 verifiable milestones** |
