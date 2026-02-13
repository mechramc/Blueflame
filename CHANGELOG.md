# Changelog

All notable changes to the Blueflame project are documented here.

---

## [Session 12–13] — 2026-02-13

### Added
- **SCR Governance (Spec-Freeze Doctrine)**: Formal Spec Change Request workflow for modifying frozen specs — create SCR with reason, automatic DiffPack + impact analysis, approve/reject by Authorizer, delta execution
- **Delta Execution**: Patch existing plans and re-execute only affected tasks (never a fresh run). BaselineSnapshot preserves completed work
- **SCR Shared Types**: `SCRStatus`, `SCRSeverity`, `DiffPack`, `DiffPackItem`, `TaskPatch`, `TaskPatchEntry`, `BaselineSnapshot`, `SpecChangeRequest` in `packages/shared`
- **SCR Service**: `createSCR()`, `approveSCR()`, `rejectSCR()`, `executeDeltaRun()` in `apps/api/src/services/scr-service.ts`
- **SCR API Routes**: 6 REST endpoints (`POST /api/scr`, `GET /api/scr/:scrId`, `GET /api/scr/project/:projectId`, `PUT /api/scr/:scrId/approve`, `PUT /api/scr/:scrId/reject`, `POST /api/scr/:scrId/execute`)
- **SCR Panel UI**: Multi-step governance UI in `apps/web/components/spec/SCRPanel.tsx` (idle → editing → reviewing → approved → executing)
- **Patch Mode Agent Constraints**: Builder agents receive constrained prompts during delta execution
- **Orchestrator `applyTaskPatch()`**: Patches existing run plans (invalidate/cancel/add/update tasks)

### Changed
- **ChatPanel**: Shows SCR Panel when spec is frozen (replaces static "frozen" message)
- **Project Page**: Passes frozen spec ID and content to ChatPanel for SCR integration
- **Documentation**: Updated README.md, STATUS.md, CHECKPOINT.md, PRD, Spec, tasks-readable.md

---

## [Session 10–11] — 2026-02-12

### Added
- **12-Phase Gap Resolution**: All 13 integration gaps resolved (~61 files, ~3400 lines)
  - Phase 1: Auth wiring + dev role picker (`DevAuthProvider`, `api-client.ts`)
  - Phase 2: Projects CRUD API + Cosmos container
  - Phase 3: Dynamic home page (project list, create dialog)
  - Phase 4: Run dashboard API contract fix (events, action stream)
  - Phase 5: Navigation links (Compliance, Chargeback)
  - Phase 6: Compliance backend (audit log API)
  - Phase 7: Chargeback backend (cost aggregation API)
  - Phase 8: Persist in-memory state to Cosmos (write-through cache pattern)
  - Phase 9: Spec validation panel + workflow progress bar
  - Phase 10: WF3 Build-to-Verify fixer loop (max 3 retries)
  - Phase 11: WF5 Autonomous healing + WF6 Delta API
  - Phase 12: WF7 Knowledge store + WF8 GitHub Actions integration
- **SpecActions Button**: "Generate Plan & Execute" wired to correct API contracts

### Fixed
- **Dockerfile**: Added missing `packages/github-app/` copy
- **Biome**: Added `.claude` and `.vscode` to ignore list
- **Cosmos**: Created `projects` container in Azure

---

## [Session 8] — 2026-02-12

### Added
- **S12: ACAR σ-Routing**: Multi-provider model routing with self-consistency sampling (Azure OpenAI + Anthropic + Google + OpenAI Direct)
- **S13: Enterprise Governance**: OpenTelemetry tracing, compliance dashboard, reasoning trace viewer
- **S14: Spec Delta Detection**: Semantic diff engine, impact classifier (PRESERVE/REBUILD/NEW/REMOVE), DeltaImpactMap UI
- **S15: CI/CD Templates**: Failures Cosmos container, 5 verifier templates, security constraint types, ADO outbound client, GitHub Actions failure normalizer
- **S16: Enterprise Budgeting**: Budget pool manager, chargeback dashboard

### Deferred
- S16-004: Azure SignalR migration (Socket.IO adequate)
- S16-005: Application Insights SDK (OTel spans cover this)

---

## [Session 7] — 2026-02-11

### Changed
- **UI Redesign**: Professional dark theme (Linear/Vercel style) across 30+ components
- **Design System**: CSS custom properties, `bf.*` Tailwind tokens, Inter + JetBrains Mono fonts

### Fixed
- Environment variable issues (dotenv, Cosmos var rename, Foundry deployments)

---

## [Session 6] — 2026-02-11

### Added
- **S11: CI/CD Failure Intelligence**: ADO adapter, Fixer agent, remediation auth gate, failure dashboard
- **Demo wiring**: NavHeader, landing page, ChatPanel API, SpecEditor API, failures API, demo seed endpoint

---

## [Session 5] — 2026-02-11

### Added
- **Visual Animations**: 16 keyframe animations across 11 dashboard components

---

## [Sessions 1–4] — 2026-02-10 to 2026-02-11

### Added
- **S1: Project Scaffold**: Turborepo monorepo, Bicep templates, CI/CD, SignalR, shared types
- **S2: Authentication**: Entra ID SSO, 4-tier RBAC
- **S3: Cosmos DB**: 8 container repositories, change feed processor
- **S4: Chat Interface**: Chat UI, Designer agent
- **S5: Spec Engine**: Spec editor, generation, freeze + versioning
- **S6: Planning Engine**: Task decomposition, DAG, authorization gate
- **S7: Agent Swarm**: Builder, Verifier, Explainer agents, orchestrator
- **S8: GitHub Integration**: Branch/PR creation, webhook handlers
- **S9: Budget System**: Cost tracking, budget enforcement, partial execution
- **S10: Observability Dashboard**: Agent cards, DAG progress, cost burn-down
