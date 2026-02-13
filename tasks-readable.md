# Blueflame — Task Breakdown (Human-Readable)

**Source:** `tasks.yaml` (canonical) | **Spec:** `Blueflame-Spec-v3-ACAR.md` | **PRD:** `Blueflame-PRD.md`

**Stack:** TypeScript / Next.js | **Agent:** Claude Code | **Deadline:** March 15, 2026

---

## Progress Tracker

| Sprint | Tasks | Status |
|---|---|---|
| Week 1 (Feb 10–16) | S1-001 → S1-005, S2-001 → S2-002, S3-001 | DONE |
| Week 2 (Feb 17–23) | S3-002 → S3-003, S4-001 → S4-002, S5-001 → S5-003, S6-001 | DONE |
| Week 3 (Feb 24–Mar 2) | S6-002 → S6-003, S7-001 → S7-004, S8-001 → S8-002 | DONE |
| Week 4 (Mar 3–9) | S9-001 → S9-002, S10-001 → S10-002, S14-001 → S14-002 | DONE |
| Week 5 (Mar 10–14) | S11-001 → S11-005 | DONE |
| Week 6 | S12-001 → S16-003 (enterprise streams) | DONE |
| Session 10–11 | 12-phase gap resolution (13 gaps) | DONE |
| Session 12–13 | SCR governance + delta execution + docs | DONE |
| Final | Demo recording, polish, submission | In progress |

**Total tasks: 78** | **Completed: 73** | **Deferred: 2** | **Demo: 2 remaining**

---

## Dependency Graph (Execution Order)

```
S1-001 (scaffold)
├── S1-002 (bicep)
├── S1-003 (CI)
├── S1-004 (signalr)
├── S1-005 (types)
├── S2-001 (auth)
│   └── S2-002 (rbac)
└── S3-001 (cosmos client)
    └── S3-002 (repositories)
        ├── S3-003 (change feed)
        ├── S5-002 (spec generation)
        │   └── S5-003 (spec freeze)
        │       ├── S6-001 (planner)
        │       │   ├── S6-002 (plan UI)
        │       │   ├── S6-003 (authorization)
        │       │   │   └── S7-004 (orchestrator)
        │       │   │       ├── S9-001 (budget)
        │       │   │       │   └── S9-002 (budget UI)
        │       │   │       └── S10-001 (agent cards)
        │       │   │           └── S10-002 (dashboard)
        │       │   └── S14-001 (delta detection)
        │       │       └── S14-002 (delta UI)
        │       └── S7-001 (builder agent)
        │           ├── S7-002 (verifier agent)
        │           │   └── S7-003 (explainer agent)
        │           └── (needs S8-001)
        └── S4-002 (designer agent)

S4-001 (chat UI) ── needs S2-001
S5-001 (spec editor) ── needs S4-001
S8-001 (github client) ── needs S1-001
S8-002 (webhooks) ── needs S8-001

S11-001 (failure schema + ADO adapter) ── needs S8-002, S3-002
├── S11-002 (failure analyzer agent) ── needs S11-001
│   └── S11-003 (remediation auth gate) ── needs S11-002, S6-003
│       └── S11-004 (failure dashboard UI) ── needs S11-003, S10-002
└── S11-005 (enterprise upgrade docs) ── needs S11-004
```

---

## Week 1: Foundation (Feb 10–16)

### S1-001: Initialize Turborepo Monorepo
- **Priority:** P0 | **System:** Scaffold
- **What:** Create monorepo with apps/web, apps/api, packages/shared, packages/cosmos, packages/foundry, packages/github-app
- **Files:** `package.json`, `turbo.json`, `tsconfig.base.json`, `biome.json`, all app/package scaffolds
- **Verify:** `npm install && npm run build && npm run lint`
- **Status:** DONE

### S1-002: Azure Bicep Templates
- **Priority:** P0 | **System:** Scaffold
- **What:** Bicep for all Azure resources: Cosmos DB (8 containers), Blob, SignalR, Key Vault, Container Apps, Static Web Apps, Log Analytics
- **Files:** `infra/main.bicep`, `infra/modules/*.bicep`, `infra/parameters.*.json`
- **Verify:** `az bicep build --file infra/main.bicep`
- **Depends on:** —
- **Status:** DONE

### S1-003: GitHub Actions CI Pipeline
- **Priority:** P0 | **System:** Scaffold
- **What:** CI on PR (install → lint → typecheck → test) + deploy on main
- **Files:** `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- **Depends on:** S1-001
- **Status:** DONE

### S1-004: SignalR Connection
- **Priority:** P0 | **System:** Scaffold
- **What:** Socket.IO hub on API, client hook on Web, test echo channel
- **Files:** `apps/api/src/signalr/*`, `apps/web/lib/signalr-client.ts`, `apps/web/hooks/useSignalR.ts`
- **Depends on:** S1-001
- **Status:** DONE

### S1-005: Shared TypeScript Types
- **Priority:** P0 | **System:** Scaffold
- **What:** All domain interfaces: OutputSpec, TaskPlan, PlanLock, Run, AgentState, Constraint, etc.
- **Files:** `packages/shared/src/types/*.ts`
- **Depends on:** S1-001
- **Status:** DONE

### S2-001: Entra ID SSO
- **Priority:** P0 | **System:** Auth
- **What:** MSAL integration in Next.js, sign-in/sign-out, protected routes
- **Files:** `apps/web/lib/msal-config.ts`, `apps/web/components/auth/*`, `apps/web/middleware.ts`
- **Depends on:** S1-001
- **Status:** DONE

### S2-002: RBAC Middleware + Role Gating
- **Priority:** P0 | **System:** Auth
- **What:** JWT validation, role extraction, 4-tier RBAC, `useRole()` hook, `<RoleGate>` component
- **Files:** `apps/api/src/middleware/auth.ts`, `apps/api/src/middleware/rbac.ts`, `apps/web/hooks/useRole.ts`
- **Depends on:** S2-001
- **Status:** DONE

### S3-001: Cosmos DB Client + Base Repository
- **Priority:** P0 | **System:** Data Layer
- **What:** @azure/cosmos client wrapper, typed base repository with CRUD, retry logic
- **Files:** `packages/cosmos/src/client.ts`, `packages/cosmos/src/repository.ts`
- **Depends on:** S1-001, S1-005
- **Status:** DONE

---

## Week 2: Core Loop (Feb 17–23)

### S3-002: All 7 Container Repositories
- **Priority:** P0 | **System:** Data Layer
- **What:** Specs, Plans, Locks (create-only!), Runs (state machine!), Agents, Constraints, Documents
- **Files:** `packages/cosmos/src/repositories/*.ts`
- **Depends on:** S3-001
- **Status:** DONE

### S3-003: Cosmos Change Feed Processor
- **Priority:** P0 | **System:** Data Layer
- **What:** Change feed on runs + agents → typed events → SignalR
- **Files:** `packages/cosmos/src/change-feed/*`, `apps/api/src/services/change-feed-bridge.ts`
- **Depends on:** S3-002, S1-004
- **Status:** DONE

### S4-001: Chat UI Component
- **Priority:** P0 | **System:** Chat
- **What:** Message bubbles, input, typing indicator, markdown rendering, split-view left panel
- **Files:** `apps/web/components/chat/*`, `apps/web/app/project/[projectId]/page.tsx`
- **Depends on:** S1-001, S2-001
- **Status:** DONE

### S4-002: Designer Agent (Streaming)
- **Priority:** P0 | **System:** Chat
- **What:** Foundry Agent Service, GPT-4o, requirement elicitation prompt, SignalR streaming
- **Files:** `packages/foundry/src/agents/designer.ts`, `apps/api/src/routes/chat.ts`
- **Depends on:** S4-001, S1-004, S3-001
- **Status:** DONE

### S5-001: Spec Editor (Monaco + Split View)
- **Priority:** P0 | **System:** Spec Engine
- **What:** Monaco YAML editor, status badge, accept/freeze buttons, resizable split view
- **Files:** `apps/web/components/spec/*`, `apps/web/components/layout/SplitView.tsx`
- **Depends on:** S4-001
- **Status:** DONE

### S5-002: Spec Generation from Conversation
- **Priority:** P0 | **System:** Spec Engine
- **What:** Foundry agent (o1) transforms conversation → YAML OutputSpec, stored in Cosmos
- **Files:** `packages/foundry/src/agents/spec-generator.ts`, `apps/api/src/routes/specs.ts`
- **Depends on:** S4-002, S3-002, S1-005
- **Status:** DONE

### S5-003: Spec Freeze (SHA-256 + Versioning)
- **Priority:** P0 | **System:** Spec Engine
- **What:** Freeze endpoint, SHA-256 hash, immutability, version increment on edit
- **Files:** `apps/api/src/services/spec-freeze.ts`, `packages/shared/src/utils/hash.ts`
- **Depends on:** S5-002, S3-002
- **Status:** DONE

### S6-001: Planner Agent (Task Decomposition)
- **Priority:** P0 | **System:** Planning
- **What:** Foundry agent (o1), takes frozen spec → task DAG with dependencies, costs, σ estimates
- **Files:** `packages/foundry/src/agents/planner.ts`, `apps/api/src/services/planning.ts`
- **Depends on:** S5-003, S3-002
- **Status:** DONE

---

## Week 3: Agent Swarm + DevOps (Feb 24–Mar 2)

### S6-002: Task Plan UI + DAG Visualization
- **Priority:** P0 | **System:** Planning
- **What:** Task table, DAG graph (dagre/elkjs), budget input, authorize button (role-gated)
- **Depends on:** S6-001, S2-002
- **Status:** DONE

### S6-003: Authorization Gate (plan.lock)
- **Priority:** P0 | **System:** Planning
- **What:** Create immutable PlanLock, RBAC check, budget ceiling, constraint snapshot
- **Depends on:** S6-001, S3-002, S2-002
- **Status:** DONE

### S7-001: Builder Agent
- **Priority:** P0 | **System:** Agent Swarm
- **What:** Creates branch, generates code, opens PR. Uses Claude Sonnet 4.5.
- **Depends on:** S6-003, S8-001
- **Status:** DONE

### S7-002: Verifier Agent (Agentic DevOps)
- **Priority:** P0 | **System:** Agent Swarm | **DEMO CRITICAL**
- **What:** Triggers GitHub Action, receives CI results, evaluates vs. acceptance criteria
- **Depends on:** S7-001, S8-002
- **Status:** DONE

### S7-003: Explainer Agent
- **Priority:** P0 | **System:** Agent Swarm
- **What:** Reads diffs + test results, generates PR descriptions with traceability, root cause analysis
- **Depends on:** S7-002, S8-001
- **Status:** DONE

### S7-004: Orchestrator Engine
- **Priority:** P0 | **System:** Agent Swarm | **DEMO CRITICAL**
- **What:** DAG executor, parallel spawning, A2A handoff, state tracking, interrupt support
- **Depends on:** S7-001, S7-002, S7-003, S3-003
- **Status:** DONE

### S8-001: GitHub App Client
- **Priority:** P0 | **System:** GitHub
- **What:** Octokit wrapper: branch, commit, PR, Actions, diff operations. Token management.
- **Depends on:** S1-001
- **Status:** DONE

### S8-002: GitHub Webhook Handler
- **Priority:** P0 | **System:** GitHub
- **What:** Receive workflow_run + check_run + PR review events. Signature verification. Route to orchestrator.
- **Depends on:** S8-001
- **Status:** DONE

---

## Week 4: Governance + Dashboard (Mar 3–9)

### S9-001: Budget Monitor
- **Priority:** P1 | **System:** Budget
- **What:** Cost tracking, 80% warning, 95% pause, partial result handling
- **Depends on:** S7-004
- **Status:** DONE

### S9-002: Budget UI
- **Priority:** P1 | **System:** Budget
- **What:** Cost progress bar, warning alert, pause decision modal (Resume/Accept/Abandon)
- **Depends on:** S9-001, S1-004
- **Status:** DONE

### S10-001: Agent Status Cards
- **Priority:** P1 | **System:** Dashboard
- **What:** Real-time agent cards (role, task, status, model, tokens) via SignalR
- **Depends on:** S3-003, S7-004
- **Status:** DONE

### S10-002: Dashboard Layout (DAG + Action Stream)
- **Priority:** P1 | **System:** Dashboard | **DEMO CRITICAL**
- **What:** DAG progress viz, live action stream, unified dashboard. Must look great on screen recording.
- **Depends on:** S10-001, S6-002, S9-002
- **Status:** DONE

### S14-001: Spec Delta Detection Engine
- **Priority:** P1 | **System:** Delta | **DEMO CRITICAL (Workflow 6)**
- **What:** YAML diff + semantic analysis, change classification, impact mapping per task
- **Depends on:** S5-003, S6-001
- **Status:** DEFERRED (post-S11)

### S14-002: Delta Impact Map UI
- **Priority:** P1 | **System:** Delta
- **What:** Color-coded task impact: green/amber/blue/red. Re-authorize button.
- **Depends on:** S14-001, S6-002
- **Status:** DEFERRED (post-S11)

---

## Week 5: Failure Intelligence (Mar 10–14)

### S11-001: Normalized Failure Schema + ADO Adapter
- **Priority:** P0 | **System:** Failure Intelligence
- **What:** Provider-agnostic failure schema (Zod-validated). Azure DevOps service hook handler. Pipeline log extraction. Test results normalization. In-memory failure store.
- **Files:** `packages/shared/src/types/failure.ts`, `apps/api/src/services/ado-adapter.ts`, `apps/api/src/webhooks/ado.ts`, `apps/api/src/routes/failures.ts`
- **Depends on:** S8-002, S3-002
- **Status:** Not started

### S11-002: Failure Analyzer Agent
- **Priority:** P0 | **System:** Failure Intelligence
- **What:** Foundry agent that reads normalized failure + pipeline logs + codebase context. Produces root cause analysis and remediation task DAG with σ estimates.
- **Files:** `packages/foundry/src/agents/fixer.ts`, `packages/foundry/src/agents/prompts/fixer-system.ts`
- **Depends on:** S11-001
- **Status:** Not started

### S11-003: Remediation Authorization Gate
- **Priority:** P0 | **System:** Failure Intelligence
- **What:** Create new plan.lock with parentLockId linking to original. RBAC check. Budget ceiling for remediation. Reuse existing authorization service with remediation flag.
- **Files:** `apps/api/src/services/remediation.ts`, `apps/api/src/routes/remediation.ts`
- **Depends on:** S11-002, S6-003
- **Status:** Not started

### S11-004: Failure Intelligence Dashboard UI
- **Priority:** P1 | **System:** Failure Intelligence | **DEMO CRITICAL**
- **What:** Failure timeline, root cause display, remediation plan view, pipeline re-run status. Integrates with existing DashboardLayout.
- **Files:** `apps/web/components/failures/*`, `apps/web/app/project/[projectId]/failures/page.tsx`
- **Depends on:** S11-003, S10-002
- **Status:** Not started

### S11-005: Enterprise Upgrade Path Documentation
- **Priority:** P1 | **System:** Documentation
- **What:** Document enterprise migration paths for all components. Update spec, README, and architecture docs.
- **Files:** Spec §23, README Enterprise section, `docs/enterprise-upgrade-paths.md`
- **Depends on:** S11-004
- **Status:** Not started

---

## Week 6: Demo + Polish (Mar 14–15)

### Demo Recording Checklist
- [ ] Workflow 1 (Greenfield): Full 6-stage lifecycle — 4 min
- [ ] Workflow 4 (Bug Fix): Root cause analysis — 2.5 min
- [ ] Workflow 7 (Failure Intelligence): ADO failure → governed remediation — 2.5 min
- [ ] Workflow 5 (Budget): Cost governance + partial execution — 2 min
- [ ] Workflow 6 (Spec Change): Delta detection + surgical rebuild — 2.5 min
- [ ] Mention Workflows 2 + 3 — 1 min
- [ ] Total: 12–15 min

### Polish Tasks
- [ ] Error handling for all edge cases
- [ ] Loading states for all async operations
- [ ] Empty states for first-time users
- [ ] Mobile-responsive dashboard (nice to have)
- [ ] Submission package: README, video, screenshots
