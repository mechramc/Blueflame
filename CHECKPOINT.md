# Blueflame — Checkpoint (Cross-Tool Handoff)

> **Purpose**: This is the handoff document between Claude Code and Codex.
> Whichever tool picks up work next MUST read this file first.
> Updated by whichever tool finishes a work session.

---

## Last Updated By
- **Tool**: Claude Code
- **Date**: 2026-02-12
- **Session**: 9

## Current State
- **Phase**: Production-Ready Azure Migration — Phases 0–5 complete
- **Last completed task**: Phase 5 (Deploy to Azure — infra + CI/CD)
- **Next task**: User deploys Azure resources, then demo recording
- **Branch**: `main`
- **Repo is green**: YES (build, lint, test all pass — 613 tests)
- **Last commit**: `326124e` — phase(infra): Docker build pipeline and Azure deployment config

## What Just Happened (Session 9)

### Production-Ready Migration — In-Memory → Azure

Migrated all API services from `new Map()` to Cosmos DB repositories, added telemetry, real ADO client, Docker support, and Azure deployment infrastructure.

#### Phase 0+1: Cosmos DB Migration (from previous context)
- Created `apps/api/src/db.ts` singleton with all 8 repositories
- Migrated 9 services to async Cosmos operations with fire-and-forget persistence
- Created `__mocks__/db.ts` for test isolation
- Updated all test files with `vi.mock("../db.js")`
- Added `Cancelled` and `Unknown` to `FailureType` enum
- Fixed auth middleware to use `ENTRA_API_URI` for JWT audience validation
- Added Entra ID env vars (`ENTRA_API_URI`, `NEXT_PUBLIC_REDIRECT_URI`)

#### Phase 2: Telemetry → Application Insights
- Updated `packages/foundry/src/tracing/telemetry.ts` with dual output
- In-memory spans (for dashboard) + App Insights export when connection string set
- `initTelemetry()` called at API startup, gated behind `APPLICATIONINSIGHTS_CONNECTION_STRING`
- Installed `applicationinsights@3.13.0`
- +4 tests

#### Phase 3: ADO Client — Real SDK
- Rewrote `ado-client.ts` with `IAdoClient` interface
- `SimulatedAdoClient` (in-memory, for dev) + `RealAdoClient` (azure-devops-node-api SDK)
- Factory function `createAdoClientFromEnv()` picks based on `ADO_PAT`
- Status mapping functions for build status/result enums
- Installed `azure-devops-node-api@^15.1.2`
- +2 tests

#### Phase 4: Docker + Health Endpoint
- Created `apps/api/Dockerfile` (multi-stage, node:20-alpine)
- Created `.dockerignore`
- Enhanced `/health` endpoint with Cosmos/telemetry/Entra status + uptime

#### Phase 5: Deploy Infrastructure
- Updated `deploy.yml`: Docker build+push to GHCR, Container Apps deploy with registry auth
- Enhanced `container-apps.bicep`: env vars, secrets (Cosmos key, App Insights, Entra)
- Added Cosmos `primaryKey` output for secret injection
- Added `entraClientId` param to `main.bicep`

### Session Metrics
- **Tests**: 540 → 613 (+73)
- **Commits**: 3 (Phase 0+1, Phase 2+3+4, Phase 5)
- **Phases completed**: 0, 1, 2, 3, 4, 5

## Prior Sessions Summary

- **Sessions 1–4**: S1-001 through S10-002 — ALL COMPLETE (26 tasks)
- **Session 5**: Visual animations (16 keyframes, 11 components) + document overhaul
- **Session 6**: S11 Failure Intelligence (5 tasks) + Demo wiring (7 tasks)
- **Session 7**: UI redesign (30+ components) + env fix + enterprise planning (20 tasks defined)
- **Session 8**: ALL enterprise streams implemented (15/18 tasks, 2 deferred, +87 tests)
- **Session 9**: Production migration (Cosmos, telemetry, ADO, Docker, Azure deploy)

## What To Pick Up Next

### User Actions Required for Deployment
1. **Deploy Azure resources**: `az deployment group create -f infra/main.bicep -p infra/parameters.prod.json`
2. **Add GitHub secrets**: `AZURE_CREDENTIALS`, `AZURE_STATIC_WEB_APPS_API_TOKEN`
3. **Add GitHub variable**: `AZURE_RESOURCE_GROUP`
4. **Push to main** to trigger deploy workflow
5. **Add production redirect URI** in Entra ID app registration
6. **Create guest accounts** for judges (Phase 6)

### Remaining Work — Demo + Submission
1. **Demo recording** — 7 workflow demonstrations
2. **Submission package** — README, architecture diagram, demo video, ACAR paper

### What's Deferred (OK to skip)
- **S16-004: Azure SignalR migration** — Socket.IO works; migration is mechanical
- **S16-005: Application Insights SDK** — OTel spans already provide instrumentation

## Blockers
- None (deployment is user action, not code blocker)

## Key Files Reference (Updated)
- `Blueflame-Spec-v3-ACAR.md` — Source of truth (24 sections)
- `tasks.yaml` — Full task list (S1–S16)
- `docs/STATUS.md` — Updated with all enterprise tasks complete
- **DB Singleton**: `apps/api/src/db.ts` (all 8 Cosmos repositories)
- **DB Mock**: `apps/api/src/__mocks__/db.ts` (in-memory test isolation)
- **Routing**: `packages/foundry/src/routing/` (sigma-router, model-registry, 4 providers)
- **Tracing**: `packages/foundry/src/tracing/telemetry.ts` (spans + App Insights export)
- **Dockerfile**: `apps/api/Dockerfile` (multi-stage node:20-alpine)
- **Deploy**: `.github/workflows/deploy.yml` (Docker → GHCR → Container Apps)
- **Infra**: `infra/main.bicep` + `infra/modules/*.bicep` (7 Azure modules)
- **ADO Client**: `apps/api/src/services/ado-client.ts` (simulated + real SDK)

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
- Dashboard UI components need `afterEach(cleanup)` in tests (jsdom doesn't auto-cleanup)
- CSS uses custom properties (`--bg-primary`, `--accent`, etc.) — not direct Tailwind colors
- Fonts loaded via `next/font/google` with CSS variable strategy
- `dotenv` loads `.env` from repo root in API via `import.meta.dirname`
- Routing module uses in-memory registry; env var override pattern: `SIGMA_ROUTER_<ROLE>_<TIER>_MODEL`
- Budget manager pool IDs use counters (not Date.now()) to avoid collisions in tests
- ADO client: `createAdoClientFromEnv()` returns `RealAdoClient` when `ADO_PAT` set, `SimulatedAdoClient` otherwise
- Cosmos DB: services use fire-and-forget writes (`.catch(console.error)`) for hot-path operations
- Docker build context is repo root, Dockerfile at `apps/api/Dockerfile`
