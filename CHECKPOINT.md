# Blueflame — Checkpoint (Cross-Tool Handoff)

> **Purpose**: This is the handoff document between Claude Code and Codex.
> Whichever tool picks up work next MUST read this file first.
> Updated by whichever tool finishes a work session.

---

## Last Updated By
- **Tool**: Claude Code
- **Date**: 2026-02-11
- **Session**: 1

## Current State
- **Phase**: S5 Spec Engine (complete)
- **Last completed task**: S5-003 — Spec freeze + versioning
- **Next task**: S6-001 — Task decomposition
- **Branch**: `main`
- **Repo is green**: YES (build, lint, test all pass — 133 tests)

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

## What To Pick Up Next
1. **S6-001**: Task decomposition (Planner agent)
2. **S6-002**: DAG + authorization UI
3. **S6-003**: Plan lock (immutable plan.lock.json)

## Blockers
- None

## Key Files to Read Before Starting
- `packages/shared/src/types/` — all domain types (read before implementing repos/services)
- `packages/foundry/src/agents/` — agent prompts + streaming clients (designer, spec-generator)
- `apps/api/src/services/` — spec-generation, spec-freeze, conversation, change-feed-bridge
- `apps/api/src/routes/` — chat.ts, specs.ts (API routes)
- `Blueflame-Spec-v3-ACAR.md` — sections 8 (plan engine), 9 (agents), 10 (GitHub)
- `tasks.yaml` — acceptance criteria for each task

## Test Counts
| Scope | Count |
|-------|-------|
| Total | 133 (49 API + 44 Cosmos + 24 Web + 12 Foundry + 4 Shared) |

## Warnings for Next Tool
- `packages/shared` must be built before dependent packages (`npx turbo build`)
- Run state machine transitions enforced via `RUN_TRANSITIONS` constant — use in RunsRepository
- PlanLock is immutable — locks repository must NOT have update/delete methods
- Biome auto-fix needed after creating new files (`npm run lint:fix`)
- Bicep templates validated with `az bicep build` (az CLI v2.83.0 installed)
