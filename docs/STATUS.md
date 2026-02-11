# Blueflame — Project Status Dashboard

> **Purpose**: Orchestrator's view of overall project health.
> Tracks sprint progress, task completion, decisions, and risks.
> This is NOT the handoff document — see `CHECKPOINT.md` for cross-tool handoff.

## Current Phase
**S9 Budget System** (complete) — S9-001 and S9-002 done

## Sprint Progress

### Week 1 (Feb 10–16) — Scaffold & Infrastructure + Auth
| Task | System | Priority | Status |
|------|--------|----------|--------|
| S1-001: Turborepo monorepo init | S1 | P0 | **DONE** |
| S1-002: Azure Bicep templates | S1 | P0 | **DONE** |
| S1-003: CI/CD pipelines | S1 | P0 | **DONE** |
| S1-004: SignalR connection | S1 | P0 | **DONE** |
| S1-005: Shared types package | S1 | P0 | **DONE** |
| S2-001: Entra ID auth | S2 | P0 | **DONE** |
| S2-002: RBAC middleware | S2 | P0 | **DONE** |

### Week 2 (Feb 17–23) — Data Layer + Chat + Spec Engine
| Task | System | Priority | Status |
|------|--------|----------|--------|
| S3-001: Cosmos DB client + base repo | S3 | P0 | **DONE** |
| S3-002: 7 container repositories | S3 | P0 | **DONE** |
| S3-003: Cosmos DB change feed processor | S3 | P0 | **DONE** |
| S4-001: Chat UI | S4 | P0 | **DONE** |
| S4-002: Designer Agent | S4 | P0 | **DONE** |
| S5-001: Spec editor UI | S5 | P0 | **DONE** |
| S5-002: Spec generation | S5 | P0 | **DONE** |
| S5-003: Spec freeze + versioning | S5 | P0 | **DONE** |

### Week 3 (Feb 24–Mar 2) — Planning + Agents + GitHub
| Task | System | Priority | Status |
|------|--------|----------|--------|
| S6-001: Task decomposition | S6 | P0 | **DONE** |
| S6-002: DAG + authorization UI | S6 | P0 | **DONE** |
| S6-003: Plan lock | S6 | P0 | **DONE** |
| S7-001: Builder agent | S7 | P0 | **DONE** |
| S7-002: Verifier agent | S7 | P0 | **DONE** |
| S7-003: Explainer agent | S7 | P0 | **DONE** |
| S7-004: Orchestrator agent | S7 | P0 | **DONE** |
| S8-001: GitHub branch/PR creation | S8 | P0 | **DONE** |
| S8-002: GitHub webhook handler | S8 | P0 | **DONE** |

### Week 4 (Mar 3–9) — Budget + Dashboard
| Task | System | Priority | Status |
|------|--------|----------|--------|
| S9-001: Budget tracking | S9 | P1 | **DONE** |
| S9-002: Budget UI | S9 | P1 | **DONE** |
| S10-001: Run status dashboard | S10 | P1 | Not started |
| S10-002: Cost visualization | S10 | P1 | Not started |

### Week 5 (Mar 10–15) — Polish + Demo + Submit
| Task | Priority | Status |
|------|----------|--------|
| Demo recording | P0 | Not started |
| Submission package | P0 | Not started |

## Task Progress
- **Total**: 24/27 complete
- **P0**: 21/21 | **P1**: 2/4 | **Demo/Submit**: 0/2 | S8 (bonus P0): 2/2
- **Critical path**: COMPLETE (all P0 tasks done)

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-11 | AGENTS.md as mandatory execution rules | Enforce multi-agent QA discipline |
| 2026-02-11 | Biome over ESLint + Prettier | Faster, single tool, less config |
| 2026-02-11 | Turborepo + npm workspaces | Per spec; proven in Agni |
| 2026-02-11 | CHECKPOINT.md for cross-tool handoff | Claude Code ↔ Codex continuity |
| 2026-02-11 | Express for API (not Fastify) | Simpler, more ecosystem support |
| 2026-02-11 | Socket.IO for real-time (not Azure SignalR SDK) | No server-side Node.js SDK for Azure SignalR; Socket.IO works with Azure Web PubSub adapter for prod |
| 2026-02-11 | MSAL v2/v3 (not v5) for React auth | MSAL React v5 requires React 19; we use React 18 with Next.js 14 |
| 2026-02-11 | next.config.mjs (not .ts) | Next.js 14 doesn't support .ts config |
| 2026-02-11 | --passWithNoTests for vitest | Prevents CI failure on empty packages |
| 2026-02-11 | Sub-path export for sha256 (`@blueflame/shared/utils/hash`) | Avoid bundling `node:crypto` in Next.js client |

## Blockers
- None currently identified
- ~~**Azure CLI not installed**~~ — RESOLVED 2026-02-11: installed v2.83.0 via winget, Bicep validated

## Risks
| Risk | Impact | Mitigation | Status |
|------|--------|------------|--------|
| Foundry SDK + Node.js compat | Build failure | Test during S1-001 | Open |
| Cosmos DB emulator on Windows | Local dev blocked | Use Azure instance or Docker | Open |
| Hackathon deadline (Mar 15) | Incomplete submission | Prioritize P0 critical path | Monitoring |

## Test Counts
| Scope | Count |
|-------|-------|
| apps/web | 58 |
| apps/api | 156 |
| packages/* | 144 |
| **Total** | **358** |
