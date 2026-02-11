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
- **Phase**: S1 Scaffold & Infrastructure
- **Last completed task**: S1-004 — SignalR connection (Socket.IO)
- **Next task**: S2-001 — Entra ID auth, S2-002 — RBAC middleware
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

## What To Pick Up Next
1. **S2-001**: Entra ID authentication (depends on S1-001)
2. **S2-002**: RBAC middleware (depends on S2-001)
3. **S3-001**: Cosmos DB repositories (depends on S1-002 + S1-005)

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
| Total | 5 (SignalR hub: connect, echo, getHub, subscribe, unsubscribe) |

## Warnings for Next Tool
- `packages/shared` must be built before dependent packages (`npx turbo build`)
- Run state machine transitions enforced via `RUN_TRANSITIONS` constant — use in RunsRepository
- PlanLock is immutable — locks repository must NOT have update/delete methods
- Biome auto-fix needed after creating new files (`npm run lint:fix`)
- Bicep templates validated with `az bicep build` (az CLI v2.83.0 installed)
