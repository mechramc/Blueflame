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
- **Phase**: S3 Data Layer
- **Last completed task**: S3-003 — Change feed processor
- **Next task**: S4-001 — Chat UI, S4-002 — Designer agent
- **Branch**: `main`
- **Repo is green**: YES (build, lint, test all pass)

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

## What To Pick Up Next
1. **S4-001**: Chat UI component with message history
2. **S4-002**: Designer agent with streaming responses
3. **S5-001**: Spec generation

## Blockers
- None

## Key Files to Read Before Starting
- `packages/shared/src/types/` — all domain types (read before implementing repos/services)
- `infra/main.bicep` — Bicep orchestrator (read before deploying or modifying infra)
- `Blueflame-Spec-v3-ACAR.md` — sections 7 (auth/RBAC), 13.2 (Cosmos containers)
- `tasks.yaml` — acceptance criteria for each task

## Test Counts
| Scope | Count |
|-------|-------|
| Total | 67 (23 API + 44 Cosmos) |

## Warnings for Next Tool
- `packages/shared` must be built before dependent packages (`npx turbo build`)
- Run state machine transitions enforced via `RUN_TRANSITIONS` constant — use in RunsRepository
- PlanLock is immutable — locks repository must NOT have update/delete methods
- Biome auto-fix needed after creating new files (`npm run lint:fix`)
- Bicep templates validated with `az bicep build` (az CLI v2.83.0 installed)
