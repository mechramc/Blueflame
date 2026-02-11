# Blueflame — GitHub Issues (Bulk Import Format)
#
# Each section = one GitHub Issue
# Compatible with `gh issue create` CLI
#
# Bulk create script at bottom of file
# Labels: P0, P1, sprint/w1-w5, system/s1-s14
# Total: 27 issues

---

## S1-001: Initialize Turborepo Monorepo

**Labels:** `P0` `sprint/w1` `system/scaffold`

### Description
Create Turborepo monorepo: apps/web (Next.js 14+), apps/api (Express+TS), packages/shared, packages/cosmos, packages/foundry, packages/github-app. Biome for linting. Vitest for testing. TypeScript strict mode.

### Acceptance Criteria
- [ ] `npm install` succeeds
- [ ] `npm run dev` starts web (:3000) + api (:4000)
- [ ] `npm run lint` + `npm run test` pass
- [ ] TypeScript strict mode in all tsconfigs

### Claude Code Prompt
> Create a Turborepo monorepo with npm workspaces. apps/web = Next.js 14+, apps/api = Express with TypeScript. 4 packages: shared, cosmos, foundry, github-app. Biome for linting, Vitest for testing. TypeScript strict everywhere.

**Spec:** Sections 5, 19

---

## S1-002: Azure Bicep Templates

**Labels:** `P0` `sprint/w1` `system/scaffold`

### Description
Bicep templates for: Cosmos DB (serverless, 7 containers), Blob Storage (hot), SignalR, Key Vault, Container Apps, Static Web Apps, Log Analytics.

### Cosmos Containers
specs(/projectId), plans(/runId), locks(/runId), runs(/projectId), agents(/runId), constraints(/projectId), documents(/projectId)

### Acceptance Criteria
- [ ] `az bicep build --file infra/main.bicep` succeeds
- [ ] 7 containers with correct partition keys
- [ ] All resources tagged `project: blueflame`

**Spec:** Sections 8, 13.2

---

## S1-003: GitHub Actions CI Pipeline

**Labels:** `P0` `sprint/w1` `system/scaffold`
**Depends on:** #S1-001

### Description
CI on PR: install → lint → typecheck → test. Deploy on push to main.

### Acceptance Criteria
- [ ] CI runs on every PR
- [ ] Deploy triggers on main
- [ ] Node.js 20

---

## S1-004: SignalR Connection

**Labels:** `P0` `sprint/w1` `system/scaffold`
**Depends on:** #S1-001

### Description
SignalR hub on API, client on Web. Test echo channel. Auto-reconnect. Typed `useSignalR()` hook.

### Acceptance Criteria
- [ ] WebSocket transport established
- [ ] Echo channel works
- [ ] Auto-reconnect
- [ ] `useSignalR()` hook with typed channels

---

## S1-005: Shared TypeScript Types

**Labels:** `P0` `sprint/w1` `system/scaffold`
**Depends on:** #S1-001

### Description
All domain interfaces: OutputSpec, TaskPlan, Task, PlanLock, Run, AgentState, Constraint, UploadedDocument, AcceptanceCriterion, Deliverable, Risk. Enums: RunStatus, AgentRole, AgentStatus, ConstraintScope, ConstraintType, SpecStatus, TaskStatus.

### Acceptance Criteria
- [ ] Interfaces match spec Sections 13–14
- [ ] No `any` types
- [ ] Exported from packages/shared

---

## S2-001: Entra ID SSO

**Labels:** `P0` `sprint/w1` `system/auth`
**Depends on:** #S1-001

### Description
MSAL in Next.js: sign-in, sign-out, protected routes, user profile display.

### Acceptance Criteria
- [ ] Microsoft SSO sign-in/sign-out
- [ ] Protected routes redirect
- [ ] User profile (name, email, avatar)

---

## S2-002: RBAC Middleware + Role Gating

**Labels:** `P0` `sprint/w1` `system/auth`
**Depends on:** #S2-001

### Description
4-tier RBAC (Viewer/Editor/Authorizer/Admin). JWT role extraction. API middleware. `useRole()` hook. `<RoleGate>` component.

### Acceptance Criteria
- [ ] JWT role claims extracted
- [ ] API returns 403 for insufficient role
- [ ] `useRole()` returns current role
- [ ] `<RoleGate role="Authorizer">` hides children for lesser roles

---

## S3-001: Cosmos DB Client + Base Repository

**Labels:** `P0` `sprint/w1` `system/data`
**Depends on:** #S1-001 #S1-005

### Description
@azure/cosmos client wrapper. Typed `Repository<T>` base class with CRUD + query. Retry with exponential backoff. Supports real Cosmos DB and emulator.

### Acceptance Criteria
- [ ] Client connects to Cosmos or emulator
- [ ] Generic CRUD: create, read, update, delete, query
- [ ] Retry on transient errors
- [ ] Unit tests pass

---

## S3-002: All 7 Container Repositories

**Labels:** `P0` `sprint/w2` `system/data`
**Depends on:** #S3-001

### Description
Specific repos for: Specs, Plans, Locks, Runs, Agents, Constraints, Documents.

**Critical constraints:**
- `LocksRepository`: **NO update/delete methods** — create + read only
- `RunsRepository`: state machine enforcement (rejects invalid transitions)
- `SpecsRepository`: `freeze()` computes SHA-256

### Acceptance Criteria
- [ ] 7 repos with correct partition keys
- [ ] Locks: immutable (create + read only)
- [ ] Runs: state machine validation
- [ ] Specs: SHA-256 on freeze
- [ ] ≥80% test coverage

---

## S3-003: Cosmos Change Feed Processor

**Labels:** `P0` `sprint/w2` `system/data`
**Depends on:** #S3-002 #S1-004

### Description
Change feed on `runs` + `agents` containers. Emit typed events (RunStatusChanged, AgentStateChanged) to SignalR. < 1s latency.

### Acceptance Criteria
- [ ] Detects document changes in real-time
- [ ] Events emitted to SignalR < 1s
- [ ] Typed event interfaces
- [ ] Handles reconnection

---

## S4-001: Chat UI Component

**Labels:** `P0` `sprint/w2` `system/chat`
**Depends on:** #S1-001 #S2-001

### Description
Chat panel (left side of split view): message bubbles (user/agent), text input, typing indicator, markdown rendering, auto-scroll.

### Acceptance Criteria
- [ ] User/agent message distinction
- [ ] Markdown renders in agent messages
- [ ] Auto-scroll to latest
- [ ] Enter to send, Shift+Enter for newline
- [ ] Typing indicator during response

---

## S4-002: Designer Agent (Streaming)

**Labels:** `P0` `sprint/w2` `system/chat`
**Depends on:** #S4-001 #S1-004 #S3-001

### Description
Foundry Agent Service: GPT-4o Designer agent. Elicits requirements via clarifying questions. Streams token-by-token via SignalR. Stores conversation in Cosmos.

### Acceptance Criteria
- [ ] Streaming responses via SignalR
- [ ] ≥2 clarifying questions before offering spec generation
- [ ] Conversation persisted in Cosmos
- [ ] System prompt per spec Section 10 Stage 1

---

## S5-001: Spec Editor (Monaco + Split View)

**Labels:** `P0` `sprint/w2` `system/spec`
**Depends on:** #S4-001

### Description
Right panel: Monaco Editor with YAML support. Status badge (DRAFT/ACCEPTED/FROZEN). Accept + Freeze buttons. Resizable split.

### Acceptance Criteria
- [ ] Monaco with YAML highlighting
- [ ] Status badge reflects current state
- [ ] Accept transitions DRAFT → ACCEPTED
- [ ] Resizable split view

---

## S5-002: Spec Generation from Conversation

**Labels:** `P0` `sprint/w2` `system/spec`
**Depends on:** #S4-002 #S3-002 #S1-005

### Description
Foundry agent (o1) transforms conversation history into structured YAML OutputSpec. Populates editor. Criteria get unique IDs.

### Acceptance Criteria
- [ ] Valid YAML matching OutputSpec interface
- [ ] All required fields populated
- [ ] Criteria IDs: AC-001, AC-002, ...
- [ ] Stored in Cosmos specs container as DRAFT

---

## S5-003: Spec Freeze (SHA-256 + Versioning)

**Labels:** `P0` `sprint/w2` `system/spec`
**Depends on:** #S5-002 #S3-002

### Description
Freeze: compute SHA-256, mark immutable, prevent edits. Re-edit creates version v+1 as DRAFT.

### Acceptance Criteria
- [ ] Deterministic SHA-256 hash
- [ ] Frozen spec returns 409 on update attempt
- [ ] Edit on frozen creates new version DRAFT
- [ ] Version history queryable

---

## S6-001: Planner Agent (Task Decomposition)

**Labels:** `P0` `sprint/w2` `system/planning`
**Depends on:** #S5-003 #S3-002

### Description
Foundry agent (o1): takes frozen spec → TaskPlan with DAG. Tasks have: ID, description, acceptance_criteria_ids, dependencies, agent_role, cost estimate, σ estimate.

### Acceptance Criteria
- [ ] Task IDs: TASK-001, TASK-002, ...
- [ ] Valid DAG (no cycles)
- [ ] acceptance_criteria_ids reference valid spec criteria
- [ ] Cost estimates present
- [ ] Stored in plans container

---

## S6-002: Task Plan UI + DAG Visualization

**Labels:** `P0` `sprint/w3` `system/planning`
**Depends on:** #S6-001 #S2-002

### Description
Task table + DAG graph (dagre/elkjs) + budget input + authorize button (role-gated).

### Acceptance Criteria
- [ ] Table: ID, description, deps, cost, role
- [ ] DAG renders correct graph
- [ ] Budget input accepts USD
- [ ] Authorize button disabled for non-Authorizers

---

## S6-003: Authorization Gate (plan.lock)

**Labels:** `P0` `sprint/w3` `system/planning`
**Depends on:** #S6-001 #S3-002 #S2-002

### Description
Create immutable PlanLock: frozen spec hash, tasks, budget ceiling, per-agent limits, constraint snapshot, authorized_by/at. Requires Authorizer role. Updates Run → AUTHORIZED.

### Acceptance Criteria
- [ ] PlanLock with correct spec hash
- [ ] Immutable (no update/delete)
- [ ] 403 if not Authorizer
- [ ] Run → AUTHORIZED
- [ ] Budget + constraint snapshot stored

---

## S7-001: Builder Agent

**Labels:** `P0` `sprint/w3` `system/agents`
**Depends on:** #S6-003 #S8-001

### Description
Creates branch `blueflame/run-{id}/task-{n}`, generates code, opens PR with task ID + spec hash. Claude Sonnet 4.5 via Foundry.

### Acceptance Criteria
- [ ] Correct branch naming
- [ ] Code generated per task
- [ ] PR opened with traceability
- [ ] State tracked in agents container

---

## S7-002: Verifier Agent ⭐ DEMO CRITICAL

**Labels:** `P0` `sprint/w3` `system/agents` `demo-critical`
**Depends on:** #S7-001 #S8-002

### Description
**THE agentic DevOps moment.** Receives branch ref from Builder (A2A). Triggers GitHub Action. Receives CI results via webhook. Evaluates against acceptance criteria (not model agreement — per ACAR finding).

### Acceptance Criteria
- [ ] Triggers GitHub Action on Builder's branch
- [ ] Receives CI results via webhook callback
- [ ] Evaluates results against acceptance criteria from PlanLock
- [ ] Pass/fail per criterion logged in Cosmos
- [ ] Uses acceptance criteria as ground truth (ACAR-informed)

### Demo Note
> When the Verifier agent calls a GitHub Action to run tests and then reports back to the swarm — that is the agentic DevOps moment that wins the category.

---

## S7-003: Explainer Agent

**Labels:** `P0` `sprint/w3` `system/agents`
**Depends on:** #S7-002 #S8-001

### Description
Reads Builder diffs (GitHub Diff API) + Verifier results + original spec. Generates PR description with acceptance criteria traceability, constraint compliance, and root cause analysis (bug-fix workflow). Uses explicit diffs, not proxy estimation (ACAR attribution finding).

### Acceptance Criteria
- [ ] Reads diffs from GitHub Diff API
- [ ] PR description links acceptance criteria IDs
- [ ] Constraint compliance summary
- [ ] Root cause analysis for bug fixes
- [ ] Attribution via explicit diffs (not proxy)

---

## S7-004: Orchestrator Engine ⭐ DEMO CRITICAL

**Labels:** `P0` `sprint/w3` `system/agents` `demo-critical`
**Depends on:** #S7-001 #S7-002 #S7-003 #S3-003

### Description
Receives PlanLock. Executes tasks respecting DAG. Spawns Builders in parallel for independent tasks. A2A: Builder → Verifier handoff. Explainer runs after all verified. State → SignalR. User interrupt support.

### Acceptance Criteria
- [ ] Respects DAG dependencies
- [ ] Parallel spawn for independent tasks
- [ ] Builder → Verifier A2A handoff (branch ref)
- [ ] Explainer after all tasks verified
- [ ] State tracked in Cosmos + SignalR
- [ ] User can interrupt (EXECUTING → PAUSED)
- [ ] Run status updated at each phase

---

## S8-001: GitHub App Client

**Labels:** `P0` `sprint/w3` `system/github`
**Depends on:** #S1-001

### Description
Octokit wrapper: createBranch, commitFiles, createPR, triggerWorkflow, getDiff, getWorkflowRunResult. Installation token management with auto-refresh.

### Acceptance Criteria
- [ ] Branch creation from base
- [ ] File commit to branch
- [ ] PR creation with title, body, labels
- [ ] Workflow dispatch trigger
- [ ] Diff reading for PR
- [ ] Token auto-refresh

---

## S8-002: GitHub Webhook Handler

**Labels:** `P0` `sprint/w3` `system/github`
**Depends on:** #S8-001

### Description
Handle: workflow_run.completed, check_run.completed, pull_request.reviewed. Verify signatures. Route to orchestrator.

### Acceptance Criteria
- [ ] Webhook receives events
- [ ] Signature verification
- [ ] workflow_run.completed → Verifier
- [ ] Events logged

---

## S9-001: Budget Monitor

**Labels:** `P1` `sprint/w4` `system/budget`
**Depends on:** #S7-004

### Description
Track cumulative cost per run (token usage × pricing). WARNING at 80%. PAUSE at 95%. On pause: complete in-progress, defer not-started, preserve completed PRs.

### Acceptance Criteria
- [ ] Cost tracked per agent per task
- [ ] WARNING at 80% via SignalR
- [ ] PAUSE at 95%: orchestrator stops new spawns
- [ ] Partial results → draft PRs
- [ ] Run: EXECUTING → PAUSED

---

## S9-002: Budget UI

**Labels:** `P1` `sprint/w4` `system/budget`
**Depends on:** #S9-001 #S1-004

### Description
Cost progress bar (green → yellow → red). Warning alert. Pause modal: Resume (top-up) / Accept Partial / Abandon.

### Acceptance Criteria
- [ ] Progress bar with color transitions
- [ ] Warning at 80%
- [ ] Pause modal at 95% with 3 actions
- [ ] Resume sends top-up budget

---

## S10-001: Agent Status Cards

**Labels:** `P1` `sprint/w4` `system/dashboard`
**Depends on:** #S3-003 #S7-004

### Description
Real-time agent cards: role, task, status, model, token count. Color-coded. Via SignalR.

### Acceptance Criteria
- [ ] Real-time updates via SignalR
- [ ] Color: green (running), yellow (blocked), blue (complete), red (failed)
- [ ] Shows role, task ID, model, tokens

---

## S10-002: Dashboard Layout ⭐ DEMO CRITICAL

**Labels:** `P1` `sprint/w4` `system/dashboard` `demo-critical`
**Depends on:** #S10-001 #S6-002 #S9-002

### Description
Unified dashboard: agent cards + DAG progress (nodes light up) + cost burn-down + live action stream (scrolling log). **Must look polished for demo recording.**

### Acceptance Criteria
- [ ] DAG: gray (pending) → blue (running) → green (complete) → red (failed)
- [ ] Action stream with timestamped agent events
- [ ] All panels in unified layout
- [ ] < 1s update latency
- [ ] Clean for screen recording (no flicker)

---

## S14-001: Spec Delta Detection Engine ⭐ DEMO CRITICAL

**Labels:** `P1` `sprint/w4` `system/delta` `demo-critical`
**Depends on:** #S5-003 #S6-001

### Description
Compare two spec versions: YAML diff + semantic analysis (GPT-4o). Classify changes. Map to affected tasks via acceptance_criteria_ids. Output: PRESERVE / REBUILD / NEW / REMOVE per task.

### Acceptance Criteria
- [ ] Field-level diff between versions
- [ ] Change classification (criterion/constraint/deliverable/no-impact)
- [ ] Impact map via criteria IDs
- [ ] PRESERVE/REBUILD/NEW/REMOVE per task
- [ ] Structured JSON response

---

## S14-002: Delta Impact Map UI

**Labels:** `P1` `sprint/w4` `system/delta`
**Depends on:** #S14-001 #S6-002

### Description
Visual impact map: tasks color-coded green (PRESERVE), amber (REBUILD), blue (NEW), red (REMOVE). Re-authorize button for controlled rebuild.

### Acceptance Criteria
- [ ] Tasks color-coded correctly
- [ ] Summary counts per category
- [ ] Re-authorize creates new PlanLock for affected tasks only

---

# Bulk Issue Creation Script

Save as `scripts/create-issues.sh` and run from repo root:

```bash
#!/bin/bash
# Bulk create GitHub Issues for Blueflame
# Requires: gh CLI authenticated
# Usage: ./scripts/create-issues.sh

REPO="your-username/blueflame"
MILESTONE="Hackathon"

create_issue() {
  local title="$1"
  local body="$2"
  local labels="$3"
  
  gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --body "$body" \
    --label "$labels" \
    --milestone "$MILESTONE"
  
  echo "Created: $title"
  sleep 1  # Rate limit
}

# Week 1
create_issue "S1-001: Initialize Turborepo Monorepo" \
  "Create Turborepo monorepo: apps/web (Next.js), apps/api (Express+TS), 4 packages. Biome + Vitest. TS strict.\n\n**AC:**\n- [ ] npm install succeeds\n- [ ] npm run dev starts both apps\n- [ ] lint + test pass" \
  "P0,sprint/w1,system/scaffold"

create_issue "S1-002: Azure Bicep Templates" \
  "Bicep for: Cosmos DB (7 containers), Blob, SignalR, Key Vault, Container Apps, Static Web Apps, Log Analytics.\n\n**AC:**\n- [ ] az bicep build succeeds\n- [ ] 7 containers correct partition keys" \
  "P0,sprint/w1,system/scaffold"

create_issue "S1-003: GitHub Actions CI" \
  "CI on PR + deploy on main. Node.js 20." \
  "P0,sprint/w1,system/scaffold"

create_issue "S1-004: SignalR Connection" \
  "SignalR hub (API) + client (Web). Echo channel. Auto-reconnect. useSignalR() hook." \
  "P0,sprint/w1,system/scaffold"

create_issue "S1-005: Shared TypeScript Types" \
  "All domain interfaces + enums in packages/shared. No any types." \
  "P0,sprint/w1,system/scaffold"

create_issue "S2-001: Entra ID SSO" \
  "MSAL in Next.js. Sign-in/out. Protected routes. User profile." \
  "P0,sprint/w1,system/auth"

create_issue "S2-002: RBAC Middleware + Role Gating" \
  "4-tier RBAC. JWT extraction. API middleware. useRole() + RoleGate component." \
  "P0,sprint/w1,system/auth"

create_issue "S3-001: Cosmos DB Client + Base Repository" \
  "@azure/cosmos wrapper. Repository<T> with CRUD. Retry logic." \
  "P0,sprint/w1,system/data"

# Week 2
create_issue "S3-002: All 7 Container Repositories" \
  "Specs, Plans, Locks (CREATE-ONLY), Runs (state machine), Agents, Constraints, Documents. ≥80% coverage." \
  "P0,sprint/w2,system/data"

create_issue "S3-003: Cosmos Change Feed Processor" \
  "Change feed on runs + agents → typed events → SignalR. <1s latency." \
  "P0,sprint/w2,system/data"

create_issue "S4-001: Chat UI Component" \
  "Chat panel: bubbles, input, typing indicator, markdown, auto-scroll." \
  "P0,sprint/w2,system/chat"

create_issue "S4-002: Designer Agent (Streaming)" \
  "Foundry GPT-4o agent. Requirement elicitation. SignalR streaming. Cosmos persistence." \
  "P0,sprint/w2,system/chat"

create_issue "S5-001: Spec Editor (Monaco)" \
  "Monaco YAML editor. Status badge. Accept/Freeze buttons. Split view." \
  "P0,sprint/w2,system/spec"

create_issue "S5-002: Spec Generation from Conversation" \
  "Foundry o1 agent: conversation → YAML OutputSpec. Criteria IDs. Stored as DRAFT." \
  "P0,sprint/w2,system/spec"

create_issue "S5-003: Spec Freeze (SHA-256)" \
  "Freeze: SHA-256 hash, immutable, version increment on re-edit." \
  "P0,sprint/w2,system/spec"

create_issue "S6-001: Planner Agent" \
  "Foundry o1: frozen spec → task DAG. Dependencies, costs, σ estimates." \
  "P0,sprint/w2,system/planning"

# Week 3
create_issue "S6-002: Task Plan UI + DAG" \
  "Task table + DAG visualization (dagre). Budget input. Authorize button (role-gated)." \
  "P0,sprint/w3,system/planning"

create_issue "S6-003: Authorization Gate (plan.lock)" \
  "Immutable PlanLock. RBAC. Budget. Constraint snapshot. Run → AUTHORIZED." \
  "P0,sprint/w3,system/planning"

create_issue "S7-001: Builder Agent" \
  "Creates branch, generates code, opens PR. Claude Sonnet 4.5. blueflame/run-{id}/task-{n}." \
  "P0,sprint/w3,system/agents"

create_issue "S7-002: Verifier Agent ⭐ DEMO CRITICAL" \
  "Triggers GitHub Action → receives CI results → evaluates vs acceptance criteria. THE agentic DevOps moment." \
  "P0,sprint/w3,system/agents,demo-critical"

create_issue "S7-003: Explainer Agent" \
  "Reads diffs + results → PR description with traceability + root cause (ACAR-informed attribution)." \
  "P0,sprint/w3,system/agents"

create_issue "S7-004: Orchestrator Engine ⭐ DEMO CRITICAL" \
  "DAG executor. Parallel spawning. A2A handoff. State → SignalR. User interrupt." \
  "P0,sprint/w3,system/agents,demo-critical"

create_issue "S8-001: GitHub App Client" \
  "Octokit: branch, commit, PR, Actions, diff. Token management." \
  "P0,sprint/w3,system/github"

create_issue "S8-002: GitHub Webhook Handler" \
  "Handle workflow_run + check_run + PR review. Signature verification. Route to orchestrator." \
  "P0,sprint/w3,system/github"

# Week 4
create_issue "S9-001: Budget Monitor" \
  "Cost tracking. WARNING at 80%. PAUSE at 95%. Partial result handling." \
  "P1,sprint/w4,system/budget"

create_issue "S9-002: Budget UI" \
  "Progress bar (green→yellow→red). Warning alert. Pause modal: Resume/Accept/Abandon." \
  "P1,sprint/w4,system/budget"

create_issue "S10-001: Agent Status Cards" \
  "Real-time cards: role, task, status, model, tokens. Color-coded. Via SignalR." \
  "P1,sprint/w4,system/dashboard"

create_issue "S10-002: Dashboard Layout ⭐ DEMO CRITICAL" \
  "Unified: agent cards + DAG progress + cost burn-down + action stream. Must look polished for recording." \
  "P1,sprint/w4,system/dashboard,demo-critical"

create_issue "S14-001: Spec Delta Detection ⭐ DEMO CRITICAL" \
  "YAML diff + semantic analysis. Classify changes. Impact map: PRESERVE/REBUILD/NEW/REMOVE per task." \
  "P1,sprint/w4,system/delta,demo-critical"

create_issue "S14-002: Delta Impact Map UI" \
  "Color-coded tasks: green/amber/blue/red. Re-authorize for controlled rebuild." \
  "P1,sprint/w4,system/delta"

echo "Done! Created 27 issues."
```
