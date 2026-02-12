# Blueflame — Product Requirements Document (PRD)

**Derived from:** Blueflame-Spec-v3-ACAR.md
**Stack:** TypeScript / Next.js full-stack
**Agent tooling:** Claude Code
**Sprint window:** February 10 – March 15, 2026 (5 weeks)

---

## How to Read This Document

This PRD translates the Blueflame spec into **10 buildable systems**. Each system has: a purpose statement, user stories, technical requirements, acceptance criteria (traceable to the spec), and dependencies on other systems.

The companion `tasks.yaml` breaks each system into atomic tasks sized for Claude Code (~1 PR each).

---

## System Map

| # | System | Spec Sections | Sprint | Priority |
|---|---|---|---|---|
| S1 | Project Scaffold & Infrastructure | 5, 8, 19 | Week 1 | P0 |
| S2 | Authentication & RBAC | 5, 10 (Stage 4), 15 | Week 1 | P0 |
| S3 | Cosmos DB Data Layer | 13 | Week 1–2 | P0 |
| S4 | Chat Interface & Designer Agent | 10 (Stage 1), 11.1 | Week 2 | P0 |
| S5 | Spec Engine (Output Spec lifecycle) | 10 (Stages 2–4), 17 | Week 2 | P0 |
| S6 | Planning Engine (Derivation + Authorization) | 10 (Stages 3–4) | Week 2–3 | P0 |
| S7 | Agent Swarm (Foundry Agent Service) | 6, 7 | Week 3 | P0 |
| S8 | GitHub Integration (Agentic DevOps) | 9 | Week 3 | P0 |
| S9 | Budget System & Partial Execution | 16 | Week 4 | P1 |
| S10 | Observability Dashboard | 18 | Week 4 | P1 |
| S11 | CI/CD Failure Intelligence | 10.3, 11 | Week 5 | P0 |
| S12 | ACAR σ-Routing (Multi-Provider) | 3, 6 | Week 6 | P0 |
| S13 | Enterprise Governance (Tracing + Compliance) | 6, 15, 23 | Week 6 | P0 |
| S14 | Spec Delta Detection | 17 | Week 6 | P1 |
| S15 | CI/CD Templates & Security Constraints | 7.2, 9, 14 | Week 6 | P0 |
| S16 | Enterprise Budgeting & MS Integration | 16, 23 | Week 7 | P0 |

**Completed:** S1–S11 (all MVP systems), visual animations, demo wiring, UI redesign.
**In Progress:** S12–S16 (enterprise streams).

---

## S1: Project Scaffold & Infrastructure

### Purpose
Stand up the monorepo, Azure resources, and deployment pipeline so that all subsequent systems have a working foundation.

### User Stories
- As a developer, I can clone the repo, run `npm install`, and start both frontend and backend locally.
- As a developer, I can deploy to Azure with a single command or CI push.

### Technical Requirements

**Monorepo Structure:**
```
blueflame/
├── apps/
│   ├── web/              # Next.js frontend (Azure Static Web Apps)
│   └── api/              # Express/Fastify API (Azure Container Apps)
├── packages/
│   ├── shared/           # TypeScript types, schemas, constants
│   ├── cosmos/           # Cosmos DB client + repository pattern
│   ├── foundry/          # Microsoft Foundry SDK wrappers
│   └── github-app/       # GitHub App + Octokit client
├── infra/                # Bicep/ARM templates for Azure
├── blueflame/            # Spec artifacts (output-spec schema, etc.)
├── tasks.yaml            # This task plan
├── turbo.json
├── package.json
└── tsconfig.base.json
```

**Infrastructure (Azure):**
- Cosmos DB (NoSQL, serverless) — 7 containers per spec Section 13.2
- Azure Blob Storage (Hot tier)
- Azure Static Web Apps (Standard)
- Azure Container Apps (Consumption)
- Azure SignalR Service (Standard)
- Azure Key Vault (Standard)
- Azure Monitor + Log Analytics workspace

**Tooling:**
- Turborepo for monorepo management
- TypeScript strict mode throughout
- Biome for linting/formatting
- Vitest for unit tests
- Playwright for E2E (demo recording)

### Acceptance Criteria
- [ ] `npm install && npm run dev` starts both web (port 3000) and api (port 4000)
- [ ] `npm run deploy` provisions Azure resources via Bicep and deploys
- [ ] All 7 Cosmos DB containers exist with correct partition keys
- [ ] SignalR connection established from web to api
- [ ] Key Vault accessible from api with managed identity
- [ ] CI pipeline (GitHub Actions) runs lint + test on PR

### Dependencies
None — this is the foundation.

---

## S2: Authentication & RBAC

### Purpose
Implement Azure Entra ID SSO and the 4-tier RBAC model (Viewer, Editor, Authorizer, Admin) that gates every action in the system.

### User Stories
- As a user, I can sign in with my Microsoft account via Entra ID.
- As an Admin, I can assign roles to team members.
- As a Viewer, I can see specs and run status but cannot authorize execution.
- As an Authorizer, I can approve plan.lock and trigger agent execution.

### Technical Requirements
- Next.js middleware using `@azure/msal-node` for server-side auth
- MSAL React (`@azure/msal-react`) for client-side auth state
- Entra ID App Registration with redirect URIs for local + deployed
- 4 App Roles defined in the manifest: `Blueflame.Viewer`, `Blueflame.Editor`, `Blueflame.Authorizer`, `Blueflame.Admin`
- API middleware that validates JWT + extracts role claims
- Role-based UI rendering (disable Authorize button for Viewers/Editors)
- Entra Agent ID setup for agent identities (4 agents × project-scoped)

### Acceptance Criteria
- [ ] User can sign in via Microsoft SSO
- [ ] JWT contains role claims
- [ ] API rejects unauthorized requests with 403
- [ ] Authorize action requires `Blueflame.Authorizer` or `Blueflame.Admin` role
- [ ] Agent identities created with scoped permissions

### Dependencies
- S1 (infrastructure must exist)

---

## S3: Cosmos DB Data Layer

### Purpose
Implement the repository pattern for all 7 Cosmos DB containers with TypeScript types, CRUD operations, and change feed support.

### User Stories
- As a system, I can create, read, update, and query documents in all 7 containers.
- As a system, I can listen to change feed events for real-time state transitions.

### Technical Requirements

**Package:** `packages/cosmos/`

**Containers + Types:**

| Container | Partition Key | TypeScript Interface |
|---|---|---|
| specs | /projectId | `OutputSpec` (with version history, SHA-256 hash) |
| plans | /runId | `TaskPlan`, `PRD` |
| locks | /runId | `PlanLock` (immutable after creation) |
| runs | /projectId | `Run` (state machine: PENDING → AUTHORIZED → EXECUTING → PAUSED → COMPLETED/FAILED/PARTIAL) |
| agents | /runId | `AgentState` (status, tokens, σ, cost) |
| constraints | /projectId | `Constraint` (per Section 14.2 schema) |
| documents | /projectId | `UploadedDocument` (metadata + Blob ref) |

**Key behaviors:**
- `PlanLock` has no update method — create-only (immutability enforced in code)
- `OutputSpec` stores version array; `freezeSpec()` computes SHA-256 and marks immutable
- `Run` state transitions enforced via state machine (no rollback)
- Change feed processor for `runs` and `agents` containers → emits events to SignalR

### Acceptance Criteria
- [ ] All 7 container repositories with full CRUD (except PlanLock: create + read only)
- [ ] TypeScript interfaces match spec Section 13–14 schemas
- [ ] SHA-256 hash computation for OutputSpec freeze
- [ ] State machine for Run with transition validation (rejects invalid transitions)
- [ ] Change feed processor emits events
- [ ] Unit tests for all repositories (≥80% coverage)

### Dependencies
- S1 (Cosmos DB must be provisioned)

---

## S4: Chat Interface & Designer Agent

### Purpose
Build the conversational design UI (Stage 1) and the Designer agent that elicits requirements through dialogue.

### User Stories
- As a user, I can describe what I want to build in a chat interface.
- As a user, I see the Designer agent ask clarifying questions in real-time (streaming).
- As a user, I see a "Generate Spec" button when the Designer has enough context.

### Technical Requirements

**Frontend (`apps/web/`):**
- Chat panel (left side of split view) with message history
- Real-time streaming via SignalR (not polling)
- Markdown rendering for agent responses
- "Generate Spec" action button (appears after sufficient context)
- Typing indicators during agent response

**Backend (`apps/api/`):**
- `/api/chat` endpoint — streams Designer agent responses via SignalR
- Foundry Agent Service SDK integration (`@azure/ai-projects` or REST)
- Designer agent system prompt: requirement elicitation, ambiguity detection, progressive structuring
- Conversation memory: stored in Cosmos DB (or Foundry Enhanced Memory)

**Foundry (`packages/foundry/`):**
- Foundry project client wrapper
- Agent creation helper (Designer role)
- Model configuration: multi-provider (Azure OpenAI, Anthropic, Google, OpenAI Direct) — configurable per agent role via model registry

### Acceptance Criteria
- [ ] User can type message and receive streaming response
- [ ] Agent asks at least 2 clarifying questions before offering to generate spec
- [ ] Messages persist across page refresh
- [ ] SignalR streaming works (not chunked HTTP)
- [ ] System prompt follows spec Section 10 (Stage 1) requirements

### Dependencies
- S1 (frontend + backend running)
- S2 (user must be authenticated)
- S3 (conversation storage)

---

## S5: Spec Engine

### Purpose
Build the Output Spec lifecycle: generation from conversation, editing, versioning, freezing, and delta detection.

### User Stories
- As a user, I see the generated Output Spec in a side panel alongside chat.
- As a user, I can edit the spec using a Monaco editor with YAML schema validation.
- As a user, I can accept the spec (freezes it for planning).
- As a user, I can edit a frozen spec to create a new version (triggers delta detection).

### Technical Requirements

**Frontend:**
- Split view: chat (left) + spec editor (right)
- Monaco Editor with YAML language support and custom schema validation
- Spec status indicators: DRAFT → ACCEPTED → FROZEN
- Version history dropdown (v1, v2, ...)
- Diff view between spec versions

**Backend:**
- `/api/specs` — CRUD for OutputSpec documents
- `/api/specs/:id/freeze` — compute SHA-256, mark immutable, increment version
- `/api/specs/:id/delta` — compute diff between two versions (Section 17.1)
- Spec generation: Foundry Agent call that transforms conversation into YAML OutputSpec

**Schema (in `packages/shared/`):**
```typescript
interface OutputSpec {
  id: string;
  projectId: string;
  version: number;
  status: 'DRAFT' | 'ACCEPTED' | 'FROZEN';
  hash?: string; // SHA-256, set on freeze
  deliverables: Deliverable[];
  acceptance_criteria: AcceptanceCriterion[];
  constraints: { must: string[]; must_not: string[]; };
  non_goals: string[];
  risks: Risk[];
  definition_of_done: string;
  inherited_constraints: string[]; // from constraint registry
  created_at: string;
  updated_at: string;
}
```

### Acceptance Criteria
- [ ] Spec generated from conversation context
- [ ] Monaco editor renders and validates YAML
- [ ] Freeze computes SHA-256 and prevents further edits to that version
- [ ] New edit on frozen spec creates v(n+1) with DRAFT status
- [ ] Delta endpoint returns field-by-field diff between versions
- [ ] Spec versions queryable with full history

### Dependencies
- S3 (specs container)
- S4 (conversation context needed for generation)

---

## S6: Planning Engine

### Purpose
Build the derivation pipeline (Stage 3) and authorization gate (Stage 4): from approved spec to locked execution plan.

### User Stories
- As a user, I see a generated task plan with dependency DAG after accepting the spec.
- As a user, I can review estimated costs per task (σ-informed).
- As an Authorizer, I can set a budget ceiling and approve the plan (creates plan.lock).

### Technical Requirements

**Backend:**
- `/api/plans/derive` — Planner agent decomposes spec into task DAG
- `/api/plans/:id/authorize` — creates immutable plan.lock.json (requires Authorizer role)
- Planner agent (Foundry): takes frozen spec, outputs TaskPlan YAML
- σ estimation: for each task, Planner estimates complexity (mock σ in Week 2; real σ via N=3 sampling in Week 3)

**Frontend:**
- Task plan view: table with task ID, description, dependencies, estimated cost, agent role
- DAG visualization (simple: use `dagre` or `elkjs` for layout)
- Budget input (USD) + Authorize button (gated by role)
- Authorization confirmation modal

**Schema:**
```typescript
interface TaskPlan {
  id: string;
  runId: string;
  specId: string;
  specHash: string;
  tasks: Task[];
  total_estimated_cost: number;
}

interface Task {
  task_id: string;
  description: string;
  acceptance_criteria_ids: string[];
  dependencies: string[];
  agent_role: 'builder' | 'verifier';
  estimated_tokens: number;
  estimated_cost: number;
  sigma: number; // σ estimate
  parallelizable: boolean;
}

interface PlanLock {
  id: string;
  runId: string;
  specHash: string;
  tasks: Task[];
  budget_ceiling: number;
  per_agent_limit: number;
  constraint_snapshot: Constraint[];
  authorized_by: string;
  authorized_at: string;
}
```

### Acceptance Criteria
- [ ] Planner agent generates task DAG from frozen spec
- [ ] Tasks have dependency ordering and acceptance criteria links
- [ ] DAG rendered in UI
- [ ] Authorization creates immutable PlanLock in Cosmos DB
- [ ] Authorization rejected if user lacks Authorizer role
- [ ] PlanLock references correct spec hash

### Dependencies
- S3 (plans + locks containers)
- S5 (frozen spec required)
- S2 (RBAC for authorization gate)

---

## S7: Agent Swarm (Foundry Agent Service)

### Purpose
Deploy the 5 agent roles (Planner, Builder, Verifier, Explainer, Fixer) in Foundry Agent Service with orchestration via Foundry Workflows. Each agent role has a configurable default model+provider pair, supporting multi-provider routing (Azure OpenAI, Anthropic, Google, OpenAI Direct).

### User Stories
- As a system, I can spawn Builder agents that create branches and write code.
- As a system, I can spawn Verifier agents that trigger CI and evaluate results.
- As a system, I can spawn Explainer agents that generate PR descriptions.
- As a user, I see agent execution progress in real-time.

### Technical Requirements

**Agent Definitions (`packages/foundry/agents/`):**

| Agent | System Prompt Focus | Tools (MCP) | Default Model (Configurable) |
|---|---|---|---|
| Planner | Task decomposition, DAG, σ estimation | GitHub API (read), Cosmos (read), Foundry IQ | o1 (Azure) — fallback: Claude Opus 4.6 |
| Builder | Code implementation, branch/PR creation | GitHub API (write), Foundry IQ, Code Server MCP | Claude Sonnet 4.5 (Anthropic) — fallback: Codex / GPT-4o |
| Verifier | Test execution, constraint validation | GitHub Actions (trigger), Test Runner MCP, Cosmos (constraints) | GPT-4o (Azure) — fallback: Gemini 2.5 Pro |
| Explainer | Root cause analysis, PR descriptions, run summaries | Foundry Tracing (read), Cosmos (read), GitHub Diff API | GPT-4o (Azure) — fallback: Claude Opus 4.6 |
| Fixer | CI/CD failure analysis, remediation planning | ADO REST API (read), GitHub API (read), Foundry IQ, Cosmos (failures) | GPT-4o + Claude Sonnet 4.5 (multi-provider) |

**Orchestration (`apps/api/services/orchestrator.ts`):**
- Workflow engine: receives authorized PlanLock, spawns agents per task DAG
- Phase 1 (Sequential): Planner finalizes task assignments
- Phase 2 (Parallel): Builders spawn for independent tasks; Verifiers follow each Builder
- Phase 3 (Sequential): Explainer generates consolidated summary
- State tracked in `agents` container; emitted to SignalR
- A2A handoff: Builder completion → Verifier start (pass branch ref + task context)

**Real-time updates:**
- Agent status changes → Cosmos change feed → SignalR → dashboard

### Acceptance Criteria
- [ ] All 5 agents deployed in Foundry Agent Service (Planner, Builder, Verifier, Explainer, Fixer)
- [ ] Builder creates branch, writes files, opens PR
- [ ] Verifier triggers GitHub Action and receives results
- [ ] Explainer generates PR description with spec traceability
- [ ] Orchestrator respects dependency DAG (no task starts before deps complete)
- [ ] Agent state streamed to frontend via SignalR
- [ ] Agent execution stoppable by user (interrupt)

### Dependencies
- S3 (agents + runs containers)
- S6 (PlanLock required to spawn)
- S8 (GitHub integration for branch/PR/Actions)

---

## S8: GitHub Integration (Agentic DevOps)

### Purpose
Implement the GitHub App, branch strategy, PR workflow, and Actions integration that forms the agentic DevOps loop.

### User Stories
- As a user, I can connect my GitHub repo to Blueflame.
- As a Builder agent, I can create branches and open PRs.
- As a Verifier agent, I can trigger GitHub Actions and receive CI results.
- As a user, I review agent-generated PRs in GitHub's standard UI.

### Technical Requirements

**GitHub App (`packages/github-app/`):**
- GitHub App registration with permissions: contents (write), pull_requests (write), actions (write), checks (read)
- Octokit client wrapper with installation token management
- Branch operations: `createBranch(runId, taskId)`, `commitFiles(branch, files)`, `createPR(branch, title, body)`
- Actions operations: `triggerWorkflow(branch)`, `getWorkflowRunResult(runId)`

**Branch Strategy:**
```
main (or target branch)
└── blueflame/run-{runId}          # run branch
    ├── blueflame/run-{runId}/task-001  # task branch (Builder)
    ├── blueflame/run-{runId}/task-002
    └── blueflame/run-{runId}/task-003
```

**Webhook Handler (`apps/api/webhooks/github.ts`):**
- Receives: `workflow_run.completed`, `pull_request.reviewed`, `check_run.completed`
- Routes events to orchestrator for Verifier feedback loop

**PR Template:**
- Links to spec (spec hash, acceptance criteria IDs)
- Agent-generated description (from Explainer)
- Constraint compliance summary
- Cost report

### Acceptance Criteria
- [ ] GitHub App installable on user's repo
- [ ] Builder can create branch + commit files + open PR
- [ ] Verifier can trigger GitHub Action workflow
- [ ] Webhook receives CI results and routes to Verifier agent
- [ ] PR description includes spec traceability
- [ ] Branch naming follows `blueflame/run-{id}/task-{n}` convention
- [ ] Agent never has merge permission (branch protection enforced)

### Dependencies
- S1 (GitHub App registered)
- S7 (agents need GitHub operations)

---

## S9: Budget System & Partial Execution

### Purpose
Implement cost tracking, budget enforcement, graceful pause, and partial result handling.

### User Stories
- As a user, I see real-time cost burn-down during execution.
- As a user, I receive a warning at 80% budget.
- As a user, execution pauses at 95% and I can choose: resume, accept partial, or abandon.

### Technical Requirements

**Budget Monitor (`apps/api/services/budget-monitor.ts`):**
- Tracks cumulative cost per run (token usage × model pricing)
- Emits WARNING event at 80% threshold → SignalR → UI alert
- Emits PAUSE event at 95% → orchestrator pauses agent spawning
- Completed tasks: PRs remain open
- In-progress tasks: draft PRs with [PARTIAL] label
- Not-started tasks: marked DEFERRED

**Resume Flow:**
- User provides additional budget → new PlanLock addendum → orchestrator resumes

**Frontend:**
- Cost burn-down progress bar (green → yellow → red)
- Pause modal with 3 choices: Resume / Accept Partial / Abandon

### Acceptance Criteria
- [ ] Cost tracked per agent per task per run
- [ ] Warning at 80%, pause at 95% (thresholds configurable)
- [ ] Partial results produce draft PRs with correct labels
- [ ] Resume creates PlanLock addendum and continues execution
- [ ] Abandon cleans up branches
- [ ] Run state transitions: EXECUTING → PAUSED → RESUMED | PARTIAL_COMPLETE | ABANDONED

### Dependencies
- S7 (agent execution must be running)
- S3 (runs container for state tracking)

---

## S10: Observability Dashboard

### Purpose
Build the real-time dashboard that serves as the primary Stage 5 interface and the visual centerpiece of the demo.

### User Stories
- As a user, I see live agent statuses (running/blocked/paused/complete).
- As a user, I see the task DAG with completion progress.
- As a user, I see cost burn-down against budget.
- As a user, I see constraint evaluation results (green/red).
- As a user, I see a live action stream of agent decisions.

### Technical Requirements

**Frontend (`apps/web/components/dashboard/`):**
- Agent status cards (4 agents, color-coded by state)
- DAG progress view (nodes light up as tasks complete)
- Cost burn-down chart (recharts or similar)
- Constraint results panel (pass/fail per criterion)
- Live action stream (scrolling log of agent tool calls, powered by SignalR)
- Budget alert overlay
- Run summary panel (post-completion)

**Data Source:**
- All data via SignalR from Cosmos change feed
- No polling — fully event-driven

### Acceptance Criteria
- [ ] Dashboard updates in real-time (< 1s latency)
- [ ] Agent states reflect actual Foundry agent status
- [ ] DAG shows correct dependency relationships and completion
- [ ] Cost numbers match actual token usage
- [ ] Action stream shows agent tool calls with timestamps
- [ ] Works during demo recording (no flicker, no missing updates)

### Dependencies
- S7 (agents must emit state)
- S9 (budget data for cost display)
- S1 (SignalR connection)

---

## Deferred Systems (P2 — Week 4–5 if time permits)

### S11: Document Upload Entry (Section 11.2)
- Blob upload UI, Foundry IQ indexing, Ingestion agent
- Can be high-fidelity simulated for demo

### S12: Codebase-Context Entry (Section 11.3)
- GitHub repo indexing via Foundry IQ, constraint auto-extraction
- Can be described in demo, not shown live

### S13: Constraint Registry (Section 14)
- CRUD UI for project-level constraints, loading flow
- Core data model exists in S3; UI is the deferred part

### S14: Spec Delta Detection (Section 17)
- Semantic diff engine, impact mapping, rebuild orchestration
- **MUST be functional for Workflow 6 demo** — prioritize backend logic in Week 4

### S15: Content Safety (Section 15.3)
- Foundry Content Safety + Protected Material Detection integration
- Configuration-level; lower implementation effort

---

## Cross-Cutting Concerns

### Error Handling
- All API endpoints return structured errors: `{ error: string, code: string, details?: any }`
- Agent failures: caught by orchestrator, logged, run marked FAILED with partial results preserved
- Cosmos transient failures: retry with exponential backoff (built into `@azure/cosmos`)

### Testing Strategy
- Unit tests: Vitest, ≥80% coverage on `packages/*`
- Integration tests: Vitest with Cosmos emulator for data layer
- E2E: Playwright for critical paths (auth → chat → spec → authorize)
- Agent tests: mock Foundry responses for deterministic testing

### Environment Configuration
- `.env.local` for local dev (Cosmos emulator, local Foundry endpoint)
- `.env.production` populated from Key Vault
- All secrets via `@azure/identity` DefaultAzureCredential
