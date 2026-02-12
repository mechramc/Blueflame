# Blueflame — Checkpoint (Cross-Tool Handoff)

> **Purpose**: This is the handoff document between Claude Code and Codex.
> Whichever tool picks up work next MUST read this file first.
> Updated by whichever tool finishes a work session.

---

## Last Updated By
- **Tool**: Claude Code
- **Date**: 2026-02-12
- **Session**: 9 (final update)

## Current State
- **Phase**: Production-Ready — Fully deployed to Azure
- **Last completed task**: Full CI/CD pipeline green, API live on Azure Container Apps
- **Next task**: BSL 1.1 license, Static Web App for frontend, demo recording
- **Branch**: `main`
- **Repo is green**: YES (build, lint, test all pass — 613 tests)
- **Last commit**: `3b4de98` — fix(deploy): switch from GHCR to Azure Container Registry
- **Live API**: `https://blueflame-api-dev.blackfield-ff30bbff.centralus.azurecontainerapps.io`
- **Health**: `cosmos:true, entra:true, telemetry:false`
- **Licensing**: BSL 1.1 (source-available, Murai Labs commercial ownership)

## What Just Happened (Session 9)

### Production-Ready Migration — In-Memory → Azure → Live Deployment

Migrated all API services from `new Map()` to Cosmos DB, added telemetry, real ADO client, Docker support, Azure deployment infrastructure, and deployed the full stack live.

#### Phase 0+1: Cosmos DB Migration
- Created `apps/api/src/db.ts` singleton with all 8 repositories (lazy init pattern)
- Migrated 9 services to async Cosmos operations with fire-and-forget persistence
- Created `__mocks__/db.ts` for test isolation
- Updated all test files with `vi.mock("../db.js")`
- Added `Cancelled` and `Unknown` to `FailureType` enum
- Fixed ESM import hoisting issue: `dotenv.config()` runs after imports, so `db.ts` uses lazy getters to defer Cosmos client init until first access

#### Phase 2: Telemetry → Application Insights
- Updated `packages/foundry/src/tracing/telemetry.ts` with dual output
- In-memory spans (for dashboard) + App Insights export when connection string set
- `initTelemetry()` called at API startup, gated behind `APPLICATIONINSIGHTS_CONNECTION_STRING`
- +4 tests

#### Phase 3: ADO Client — Real SDK
- Rewrote `ado-client.ts` with `IAdoClient` interface
- `SimulatedAdoClient` (in-memory) + `RealAdoClient` (azure-devops-node-api SDK)
- Factory function `createAdoClientFromEnv()` picks based on `ADO_PAT`
- +2 tests

#### Phase 4: Docker + Health Endpoint
- Created `apps/api/Dockerfile` (multi-stage, node:20-alpine)
- Created `.dockerignore` (excludes web source, tests, docs, infra)
- Enhanced `/health` endpoint with Cosmos/telemetry/Entra status + uptime

#### Phase 5: Full Azure Deployment (Live!)
- Created Azure infrastructure via CLI:
  - 8 Cosmos DB containers (specs, plans, locks, runs, agents, constraints, documents, failures)
  - Container Apps Environment (`blueflame-cae-dev`) with Log Analytics
  - Container App (`blueflame-api-dev`) with env vars + secrets
  - Azure Container Registry (`blueflamecr`) with admin credentials
  - Service Principal granted AcrPush + AcrPull roles
  - Application Insights connected
- CI/CD pipeline: push to main → build/test → Docker build → ACR push → Container Apps update
- Fixed multiple Docker build issues (workspace package.json resolution, .dockerignore, turbo filter)
- Switched from GHCR (ephemeral tokens) to ACR (persistent credentials)
- Fixed Biome lint errors (noAssignInExpressions, noNonNullAssertion across 6 files)
- Fixed Dashboard test type errors (missing PlanTask fields, AgentRole enum)

### Session 9 Metrics
- **Tests**: 540 → 613 (+73)
- **Commits**: ~12 (Phase 0+1, Phase 2+3+4, Phase 5, + multiple deploy fixes)
- **Phases completed**: 0, 1, 2, 3, 4, 5
- **Azure resources created**: 5 (Cosmos containers, CAE, Container App, ACR, Log Analytics)
- **Pipeline**: Fully green end-to-end

### Key Fixes & Lessons
- **ESM import hoisting**: `dotenv.config()` runs after imports → lazy getter pattern for db.ts
- **GHCR token expiry**: GitHub Actions GITHUB_TOKEN is ephemeral → switched to ACR
- **Docker workspace resolution**: `npm ci` needs ALL workspace `package.json` files even if not building them
- **MSYS path mangling**: `/projectId` → `C:/Program Files/Git/projectId` on Windows Git Bash → use `MSYS_NO_PATHCONV=1`
- **Verify infra before declaring ready**: Cosmos account existing ≠ containers existing

## Prior Sessions Summary

- **Sessions 1–4**: S1-001 through S10-002 — ALL COMPLETE (26 tasks)
- **Session 5**: Visual animations (16 keyframes, 11 components) + document overhaul
- **Session 6**: S11 Failure Intelligence (5 tasks) + Demo wiring (7 tasks)
- **Session 7**: UI redesign (30+ components) + env fix + enterprise planning (20 tasks defined)
- **Session 8**: ALL enterprise streams implemented (15/18 tasks, 2 deferred, +87 tests)
- **Session 9**: Production migration + full Azure deployment (live API)

## What To Pick Up Next

### Immediate (Session 10)
1. **BSL 1.1 LICENSE file** — Licensor: Murai Labs, non-production use only, change date 3-5 years
2. **COMMERCIAL_LICENSE.md** — Enterprise licensing funnel
3. **Static Web App** for frontend deployment
4. **Demo recording** — 7 workflow demonstrations
5. **Submission package** — README, architecture diagram, demo video, ACAR paper

### What's Deferred (OK to skip)
- **S16-004: Azure SignalR migration** — Socket.IO works; migration is mechanical
- **S16-005: Application Insights SDK** — OTel spans already provide instrumentation

## Blockers
- None

## Azure Resources (Production)
| Resource | Name | Status |
|----------|------|--------|
| Resource Group | `blueflame-rg` | Active |
| Cosmos DB | `blueflame-cosmos-dev` (8 containers) | Active |
| Container Apps Env | `blueflame-cae-dev` | Active |
| Container App | `blueflame-api-dev` | Running |
| Container Registry | `blueflamecr.azurecr.io` | Active |
| Log Analytics | `blueflame-logs-dev` | Active |
| App Insights | Connected (InstrumentationKey: e583b932...) | Active |
| OpenAI | `blueflame-openai-dev` | Active |

## Key Files Reference
- `Blueflame-Spec-v3-ACAR.md` — Source of truth (24 sections)
- `tasks.yaml` — Full task list (S1–S16)
- `docs/STATUS.md` — Updated with all enterprise tasks complete
- **DB Singleton**: `apps/api/src/db.ts` (lazy getters, all 8 Cosmos repos)
- **DB Mock**: `apps/api/src/__mocks__/db.ts` (in-memory test isolation)
- **Routing**: `packages/foundry/src/routing/` (sigma-router, model-registry, 4 providers)
- **Tracing**: `packages/foundry/src/tracing/telemetry.ts` (spans + App Insights export)
- **Dockerfile**: `apps/api/Dockerfile` (multi-stage node:20-alpine)
- **Deploy**: `.github/workflows/deploy.yml` (Docker → ACR → Container Apps)
- **Infra**: `infra/main.bicep` + `infra/modules/*.bicep` (7 Azure modules)
- **ADO Client**: `apps/api/src/services/ado-client.ts` (simulated + real SDK)
- **Demo Seed**: `apps/api/src/routes/demo-seed.ts` (gated behind NODE_ENV !== 'production')

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
- `dotenv` loads `.env` from repo root in API via `import.meta.dirname`
- `db.ts` uses lazy getters — Cosmos client initializes on first access, NOT at import time
- Docker build context is repo root, Dockerfile at `apps/api/Dockerfile`
- `.dockerignore` must allow all workspace `package.json` files (npm ci needs them)
- ACR admin credentials are persistent; GHCR tokens are ephemeral (don't use GHCR)
- Container App env vars set via `az containerapp update --set-env-vars` (not in workflow)
- On Windows/MSYS: use `MSYS_NO_PATHCONV=1` prefix for az CLI commands with `/` paths
- **Licensing**: BSL 1.1 — treat as commercially owned, not open source
