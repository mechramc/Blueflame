# Blueflame — Checkpoint (Cross-Tool Handoff)

> **Purpose**: This is the handoff document between Claude Code and Codex.
> Whichever tool picks up work next MUST read this file first.
> Updated by whichever tool finishes a work session.

---

## Last Updated By
- **Tool**: Claude Code
- **Date**: 2026-02-11
- **Session**: 4

## Current State
- **Phase**: S9 Budget System (complete)
- **Last completed task**: S9-002 — Budget UI with pause decision modal
- **Next task**: S10-001 — Run status dashboard (P1)
- **Branch**: `main`
- **Repo is green**: YES (build, lint, test all pass — 358 tests)

## What Just Happened
- **S1-001 COMPLETE**: Turborepo monorepo fully scaffolded (6 packages)
- **S1-005 COMPLETE**: All domain types in `packages/shared/src/types/`
- **S1-003 COMPLETE**: GitHub Actions CI + Deploy pipelines
- **S1-002 COMPLETE**: Azure Bicep IaC (7 modules, validated with az CLI)
- **S1-004 COMPLETE**: SignalR real-time connection using Socket.IO:
  - `apps/api/src/signalr/channels.ts` — typed event maps (ServerToClient, ClientToServer)
  - `apps/api/src/signalr/hub.ts` — Socket.IO server integrated with Express HTTP server
  - `apps/web/lib/signalr-client.ts` — singleton client with auto-reconnect
  - `apps/web/hooks/useSignalR.ts` — React hook for typed channel subscriptions
  - `apps/api/src/signalr/hub.test.ts` — 5 tests (connect, echo, getHub, subscribe, unsubscribe)
  - **Decision**: Socket.IO instead of Azure SignalR SDK (no server-side Node.js SDK exists); Azure Web PubSub Socket.IO adapter for production
- **S2-001 COMPLETE**: Entra ID SSO with MSAL React v2 / MSAL Browser v3:
  - `apps/web/lib/msal-config.ts` — MSAL configuration (client ID, tenant ID, redirect URIs)
  - `apps/web/components/auth/AuthProvider.tsx` — MsalProvider wrapper with dynamic import (SSR-safe)
  - `apps/web/components/auth/SignInButton.tsx` — Microsoft SSO sign-in button
  - `apps/web/components/auth/UserMenu.tsx` — user name/email + sign-out
  - `apps/web/middleware.ts` — Next.js middleware with public path exclusions
  - **Decision**: MSAL v2/v3 (not v5) due to React 18 requirement
- **S2-002 COMPLETE**: RBAC middleware + role-based UI gating:
  - `apps/api/src/middleware/auth.ts` — JWT validation via Entra ID JWKS endpoint
  - `apps/api/src/middleware/rbac.ts` — hierarchical role enforcement (Viewer < Editor < Authorizer < Admin)
  - `apps/web/hooks/useRole.ts` — React hook returning highest role + hasMinimumRole()
  - `apps/web/components/auth/RoleGate.tsx` — conditional render by minimum role
  - `apps/api/src/middleware/rbac.test.ts` — 13 tests (getHighestRole, hasMinimumRole, requireRole middleware)

- **S3-001 COMPLETE**: Cosmos DB client + base repository:
  - `packages/cosmos/src/config.ts` — Zod-validated config, emulator support, container name constants
  - `packages/cosmos/src/client.ts` — singleton CosmosClient, getDatabase, getContainer
  - `packages/cosmos/src/errors.ts` — typed errors (NotFound, Conflict, Precondition, TooManyRequests, wrapCosmosError)
  - `packages/cosmos/src/repository.ts` — generic Repository<T> with create/read/update/delete/query/queryAll + retry with exponential backoff
  - 20 tests (10 errors + 10 repository CRUD/query)

- **S3-002 COMPLETE**: All 7 container repositories:
  - `SpecsRepository` — findByProject, freeze() with SHA-256 hash
  - `PlansRepository` — findByRun
  - `LocksRepository` — CREATE + READ ONLY (no update/delete), findByRun
  - `RunsRepository` — findByProject, transition() with state machine enforcement
  - `AgentsRepository` — findByRun
  - `ConstraintsRepository` — findByProject
  - `DocumentsRepository` — findByProject
  - 13 new tests: 5 runs (state machine), 5 locks (immutability), 3 specs (freeze/hash)

- **S3-003 COMPLETE**: Cosmos change feed processor + SignalR bridge:
  - `packages/cosmos/src/change-feed/events.ts` — typed events (RunStatusChanged, AgentStateChanged, CostUpdated)
  - `packages/cosmos/src/change-feed/processor.ts` — polls runs + agents containers, tracks status diffs, emits events
  - `packages/cosmos/src/change-feed/index.ts` — barrel exports
  - `apps/api/src/services/change-feed-bridge.ts` — routes change feed events to SignalR rooms
  - `packages/cosmos/src/change-feed/processor.test.ts` — 10 tests (start/stop, events, error handling, listener management)
  - `apps/api/src/services/change-feed-bridge.test.ts` — 5 tests (routing, cleanup)
  - 15 new tests total (10 processor + 5 bridge)

- **S4-001 COMPLETE**: Chat UI with message history:
  - `packages/shared/src/types/message.ts` — ChatMessage type (role, content, streaming flag)
  - `apps/web/components/chat/ChatPanel.tsx` — full chat interface with message list, auto-scroll, typing indicator
  - `apps/web/components/chat/MessageBubble.tsx` — user/agent message bubbles with markdown rendering
  - `apps/web/components/chat/ChatInput.tsx` — textarea with Enter-to-send, Shift+Enter for newline
  - `apps/web/components/chat/TypingIndicator.tsx` — animated dots during agent response
  - `apps/web/app/project/[projectId]/page.tsx` — split-view project page (chat left, spec right placeholder)
  - 12 tests (4 MessageBubble + 6 ChatInput + 2 TypingIndicator)

- **S4-002 COMPLETE**: Designer agent with streaming responses:
  - `packages/foundry/src/agents/prompts/designer-system.ts` — system prompt (requirement elicitation, ≥2 clarifying questions, progressive structuring)
  - `packages/foundry/src/agents/designer.ts` — Azure OpenAI streaming client, toOpenAIMessages helper
  - `apps/api/src/services/conversation.ts` — in-memory conversation store (per-project message history)
  - `apps/api/src/routes/chat.ts` — POST /api/chat (stores msg, streams via SignalR), GET /api/chat/:projectId
  - Wired into `apps/api/src/index.ts` via chatRouter
  - 17 new tests: 8 foundry (prompt + message conversion) + 9 conversation service

- **S5-001 COMPLETE**: Spec editor UI (Monaco YAML editor + status badges + actions):
  - `apps/web/components/spec/SpecStatusBadge.tsx` — DRAFT/ACCEPTED/FROZEN badges with color coding
  - `apps/web/components/spec/SpecActions.tsx` — Accept, Freeze, Regenerate buttons per status
  - `apps/web/components/spec/SpecEditor.tsx` — Monaco editor with YAML, dynamic import (SSR-safe), readOnly when frozen
  - `apps/web/components/layout/SplitView.tsx` — resizable horizontal split with draggable divider
  - Updated project page to use SplitView (chat left, spec right)
  - 12 tests (9 SpecActions/SpecStatusBadge + 3 SplitView)

- **S5-002 COMPLETE**: Spec generation from conversation context:
  - `packages/foundry/src/agents/prompts/spec-generation-system.ts` — YAML output prompt with required fields/ID formats
  - `packages/foundry/src/agents/spec-generator.ts` — generateSpec(), formatConversation(), cleanYaml()
  - `apps/api/src/services/spec-generation.ts` — in-memory spec store (CRUD, accept)
  - `apps/api/src/routes/specs.ts` — POST /generate, GET /:projectId, PUT /:specId/accept, PUT /:specId/freeze
  - 13 tests (4 foundry spec-generator + 9 spec-generation service)

- **S5-003 COMPLETE**: Spec freeze + versioning with SHA-256 hash:
  - `packages/shared/src/utils/hash.ts` — SHA-256 utility (sub-path export to avoid bundling node:crypto in browser)
  - `apps/api/src/services/spec-freeze.ts` — freezeSpec (ACCEPTED→FROZEN), editFrozenSpec (creates new DRAFT version)
  - 12 tests (4 hash + 8 freeze)

- **S6-001 COMPLETE**: Planner agent for task decomposition:
  - `packages/foundry/src/agents/prompts/planner-system.ts` — JSON output prompt with DAG rules, σ estimates, agent role assignment
  - `packages/foundry/src/agents/planner.ts` — generatePlan(), parsePlanOutput(), validateDAG() (Kahn's algorithm cycle detection)
  - `apps/api/src/services/planning.ts` — in-memory plan store, createPlanFromRaw(), getPlanByRunId()
  - `apps/api/src/routes/plans.ts` — POST /generate, GET /:runId
  - 16 foundry tests (5 prompt + 5 parser + 6 DAG validation) + 10 planning service tests

- **S6-002 COMPLETE**: Task plan UI with DAG visualization:
  - `apps/web/components/plan/TaskTable.tsx` — table with ID, description, deps, role, cost, σ, status columns
  - `apps/web/components/plan/TaskDAG.tsx` — SVG DAG with topological layer layout, color-coded by agent role
  - `apps/web/components/plan/BudgetInput.tsx` — USD budget ceiling input with 120% default
  - `apps/web/components/plan/AuthorizeButton.tsx` — role-gated button (Authorizer+ only)
  - `apps/web/components/plan/AuthorizeModal.tsx` — confirmation modal with budget/task summary
  - 19 web tests (4 TaskTable + 3 TaskDAG + 4 BudgetInput + 5 AuthorizeButton + 3 AuthorizeModal)

- **S6-003 COMPLETE**: Authorization gate (immutable PlanLock):
  - `apps/api/src/services/authorization.ts` — authorizePlan() with role/spec/budget/hash validation
  - `apps/api/src/routes/authorize.ts` — POST /api/authorize, GET /api/authorize/:runId
  - Default agent permissions (BUILDER, VERIFIER, EXPLAINER) with token/cost limits
  - Constraint snapshot included in lock
  - 10 authorization tests (role checks, budget validation, constraint snapshot, lock retrieval)

- **S7-001 COMPLETE**: Builder agent (code generation via Foundry):
  - `packages/foundry/src/agents/prompts/builder-system.ts` — system prompt: JSON output with files, commit msg, PR metadata
  - `packages/foundry/src/agents/builder.ts` — generateCode(), buildBuilderPrompt(), parseBuilderOutput()
  - 15 tests (7 prompt builder + 8 output parser)

- **S7-002 COMPLETE**: Verifier agent (CI evaluation against acceptance criteria):
  - `packages/foundry/src/agents/prompts/verifier-system.ts` — ground truth = acceptance criteria, not model agreement
  - `packages/foundry/src/agents/verifier.ts` — verifyCIResults(), buildVerifierPrompt(), parseVerifierOutput()
  - 15 tests (8 prompt builder + 7 output parser)

- **S7-003 COMPLETE**: Explainer agent (PR description + attribution via explicit diffs):
  - `packages/foundry/src/agents/prompts/explainer-system.ts` — ACAR-informed attribution, constraint compliance, root cause analysis
  - `packages/foundry/src/agents/explainer.ts` — generateExplanation(), buildExplainerPrompt(), parseExplainerOutput()
  - 14 tests (7 prompt builder + 7 output parser)

- **S7-004 COMPLETE**: Orchestrator engine (DAG execution + A2A handoff):
  - `apps/api/src/services/dag-executor.ts` — computeExecutionWaves(), getReadyTasks(), allTasksTerminal()
  - `apps/api/src/services/agent-spawner.ts` — spawnAgent(), updateAgentStatus(), recordAgentUsage(), state change callbacks
  - `apps/api/src/services/orchestrator.ts` — startExecution(), executeNextWave(), completeTask() with A2A handoff, requestInterrupt(), budget enforcement (80% warning, 95% pause)
  - `apps/api/src/routes/execution.ts` — POST /start, /advance, /complete-task, /fail-task, /interrupt; GET /:runId
  - 46 tests (17 DAG executor + 14 agent spawner + 15 orchestrator)

- **S8-001 COMPLETE**: GitHub App client with Octokit:
  - `packages/github-app/src/auth/installation-token.ts` — GitHub App JWT auth, token caching with auto-refresh
  - `packages/github-app/src/client.ts` — createOctokitClient(), branchName() helper
  - `packages/github-app/src/operations/branches.ts` — createBranch, deleteBranch, branchExists
  - `packages/github-app/src/operations/commits.ts` — commitFiles via Git Data API (blob → tree → commit → updateRef)
  - `packages/github-app/src/operations/pull-requests.ts` — createPR, updatePRBody, getPR (with labels)
  - `packages/github-app/src/operations/actions.ts` — triggerWorkflow, getWorkflowRuns, getWorkflowRun, getWorkflowRunLogs
  - `packages/github-app/src/operations/diffs.ts` — getPRDiff, compareCommits, formatDiff
  - 24 tests (2 client + 5 branches + 6 PRs + 2 commits + 5 actions + 4 diffs)

- **S8-002 COMPLETE**: GitHub webhook handler for CI feedback:
  - `apps/api/src/webhooks/verify-signature.ts` — HMAC-SHA256 signature verification (timing-safe)
  - `apps/api/src/webhooks/github.ts` — webhook router handling workflow_run, check_run, pull_request_review events
  - Event routing via onWebhookEvent() callback registration
  - Wired to POST /api/webhooks/github in API entry point
  - 15 tests (7 signature verification + 8 webhook handler)

- **S9-001 COMPLETE**: Cost tracker + budget monitor:
  - `apps/api/src/services/cost-tracker.ts` — per-agent cost accounting with model pricing tiers (gpt-4o, gpt-4o-mini, claude-sonnet-4-5, claude-haiku-4-5)
  - `apps/api/src/services/budget-monitor.ts` — budget state management, WARNING at 80%, CRITICAL/PAUSE at 95%, handleBudgetDecision (Resume/Accept/Abandon)
  - `apps/api/src/routes/budget.ts` — REST API: GET /:runId, POST /init, POST /:runId/check, POST /:runId/decision, GET /:runId/cost
  - 26 tests (11 cost-tracker + 15 budget-monitor)

- **S9-002 COMPLETE**: Budget UI with pause decision modal:
  - `apps/web/components/budget/CostProgressBar.tsx` — progress bar with green/yellow/red color transitions
  - `apps/web/components/budget/BudgetWarning.tsx` — alert overlay at 80%+ (warning) and 95%+ (critical)
  - `apps/web/components/budget/PauseDecisionModal.tsx` — 3-option modal (Resume with top-up, Accept Partial, Abandon)
  - 15 tests (6 CostProgressBar + 4 BudgetWarning + 5 PauseDecisionModal)

## What To Pick Up Next
1. **S10-001**: Run status dashboard (P1)
2. **S10-002**: DAG progress + action stream (P1)
3. Demo recording + submission package

## Blockers
- None

## Key Files to Read Before Starting
- `packages/shared/src/types/` — all domain types (read before implementing repos/services)
- `packages/foundry/src/agents/` — all 5 agents (designer, spec-generator, planner, builder, verifier, explainer)
- `apps/api/src/services/` — orchestrator, dag-executor, agent-spawner, planning, authorization, spec-generation, spec-freeze, conversation
- `apps/api/src/routes/` — execution.ts, plans.ts, authorize.ts, specs.ts, chat.ts
- `Blueflame-Spec-v3-ACAR.md` — section 9 (GitHub integration) for S8
- `tasks.yaml` — acceptance criteria for each task

## Test Counts
| Scope | Count |
|-------|-------|
| Total | 358 (156 API + 44 Cosmos + 58 Web + 72 Foundry + 24 GitHub App + 4 Shared) |

## Warnings for Next Tool
- `packages/shared` must be built before dependent packages (`npx turbo build`)
- Run state machine transitions enforced via `RUN_TRANSITIONS` constant — use in RunsRepository
- PlanLock is immutable — locks repository must NOT have update/delete methods
- Biome auto-fix needed after creating new files (`npm run lint:fix`)
- Bicep templates validated with `az bicep build` (az CLI v2.83.0 installed)
