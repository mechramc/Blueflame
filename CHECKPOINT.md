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
- **Last completed task**: S1-002 — Azure Bicep infrastructure templates
- **Next task**: S1-004 — Dev environment scripts, S2-001 — Entra ID auth
- **Branch**: `main`
- **Repo is green**: YES (build, lint, test all pass)

## What Just Happened
- **S1-001 COMPLETE**: Turborepo monorepo fully scaffolded (6 packages)
- **S1-005 COMPLETE**: All domain types in `packages/shared/src/types/` (11 enums, 7 domain interfaces, run state machine)
- **S1-003 COMPLETE**: GitHub Actions CI (`ci.yml`) and Deploy (`deploy.yml`) pipelines
- **S1-002 COMPLETE**: Azure Bicep IaC templates in `infra/`:
  - `main.bicep` — orchestrator with 7 module references
  - `modules/cosmos.bicep` — serverless account + 7 containers (specs, plans, locks, runs, agents, constraints, documents)
  - `modules/storage.bicep` — blob storage with documents + run-archives containers
  - `modules/signalr.bicep` — Free_F1 tier, Default service mode
  - `modules/keyvault.bicep` — RBAC authorization, soft delete
  - `modules/container-apps.bicep` — managed environment + API app (port 4000, scale 0-3)
  - `modules/static-web-app.bicep` — Free tier for Next.js
  - `modules/log-analytics.bicep` — Log Analytics workspace + App Insights
  - `parameters.dev.json` / `parameters.prod.json` — environment-specific params

## What To Pick Up Next
1. **S1-004**: Dev environment scripts (local dev setup, emulator config)
2. **S2-001**: Entra ID authentication (depends on S1-001)
3. **S2-002**: RBAC middleware (depends on S2-001)
4. **S3-001**: Cosmos DB repositories (depends on S1-002 + S1-005)

## Blockers
- **Azure CLI not installed**: `az` not found on dev machine — Bicep templates not validated locally. Install: `winget install -e --id Microsoft.AzureCLI` then `az bicep install`.

## Key Files to Read Before Starting
- `packages/shared/src/types/` — all domain types (read before implementing repos/services)
- `infra/main.bicep` — Bicep orchestrator (read before deploying or modifying infra)
- `Blueflame-Spec-v3-ACAR.md` — sections 7 (auth/RBAC), 13.2 (Cosmos containers)
- `tasks.yaml` — acceptance criteria for each task

## Test Counts
| Scope | Count |
|-------|-------|
| Total | 0 (scaffold phase — no domain logic yet) |

## Warnings for Next Tool
- `packages/shared` must be built before dependent packages (`npx turbo build`)
- Run state machine transitions enforced via `RUN_TRANSITIONS` constant — use in RunsRepository
- PlanLock is immutable — locks repository must NOT have update/delete methods
- Biome auto-fix needed after creating new files (`npm run lint:fix`)
- Bicep templates need `az bicep build` validation once Azure CLI is installed
