# Blueflame — Project Status Dashboard

> **Purpose**: Orchestrator's view of overall project health.
> Tracks sprint progress, task completion, decisions, and risks.
> This is NOT the handoff document — see `CHECKPOINT.md` for cross-tool handoff.

## Current Phase
**Enterprise Adaptability** — Planning complete, implementation starts next session. Full MS ecosystem integration across 4 streams.

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

### Week 4 (Mar 3–9) — Budget + Dashboard + Animations
| Task | System | Priority | Status |
|------|--------|----------|--------|
| S9-001: Budget tracking | S9 | P1 | **DONE** |
| S9-002: Budget UI | S9 | P1 | **DONE** |
| S10-001: Agent status cards | S10 | P1 | **DONE** |
| S10-002: DAG progress + dashboard | S10 | P1 | **DONE** |
| Visual animations (16 keyframes) | S10 | P1 | **DONE** |

### Week 5 (Mar 10–14) — Failure Intelligence + Demo Wiring
| Task | System | Priority | Status |
|------|--------|----------|--------|
| S11-001: Failure schema + ADO adapter | S11 | P0 | **DONE** |
| S11-002: Failure analyzer agent (Fixer) | S11 | P0 | **DONE** |
| S11-003: Remediation auth gate | S11 | P0 | **DONE** |
| S11-004: Failure dashboard UI | S11 | P1 | **DONE** |
| S11-005: Enterprise upgrade docs | S11 | P1 | **DONE** |
| NavHeader + breadcrumb navigation | Demo | P0 | **DONE** |
| Landing page + demo project card | Demo | P0 | **DONE** |
| Wire ChatPanel to API + Socket.IO | Demo | P0 | **DONE** |
| Wire SpecEditor to self-contained API | Demo | P0 | **DONE** |
| Wire failures page to remediation API | Demo | P0 | **DONE** |
| Demo seed endpoint (POST /api/demo/seed) | Demo | P0 | **DONE** |

### Session 7 — UI Redesign + Enterprise Planning
| Task | Priority | Status |
|------|----------|--------|
| Professional dark theme redesign (30+ components) | P0 | **DONE** |
| Env var fix (dotenv, Cosmos var rename, Foundry deployments) | P0 | **DONE** |
| Enterprise implementation plan (4 streams, 20 tasks) | P0 | **DONE** |

### Week 6 (Next) — Enterprise Stream 1: ACAR + Governance + CI/CD
| Task | System | Priority | Status |
|------|--------|----------|--------|
| S12-001: σ-based model routing | S12 | P0 | Not started |
| S12-002: Self-consistency sampling | S12 | P1 | Not started |
| S12-003: Cost tracking per model tier | S12 | P1 | Not started |
| S13-001: OpenTelemetry tracing | S13 | P0 | Not started |
| S13-002: Compliance dashboard | S13 | P0 | Not started |
| S13-003: Reasoning trace viewer | S13 | P1 | Not started |
| S14-001: Spec delta detection engine | S14 | P1 | Not started |
| S14-002: Spec delta impact map UI | S14 | P1 | Not started |
| S15-001: Failures container (Cosmos) | S15 | P0 | Not started |
| S15-002: Verifier templates | S15 | P0 | Not started |
| S15-003: Security constraint types | S15 | P1 | Not started |
| S15-004: ADO outbound client | S15 | P1 | Not started |
| S15-005: GitHub Actions failure wiring | S15 | P1 | Not started |

### Week 7 (Next) — Enterprise Stream 2: Budgeting + MS Integration
| Task | System | Priority | Status |
|------|--------|----------|--------|
| S16-001: Azure Cost Management integration | S16 | P0 | Not started |
| S16-002: Org-level budget pools | S16 | P0 | Not started |
| S16-003: Chargeback reporting dashboard | S16 | P1 | Not started |
| S16-004: Azure SignalR migration | S16 | P1 | Not started |
| S16-005: Application Insights instrumentation | S16 | P1 | Not started |

### Final — Demo + Submit
| Task | Priority | Status |
|------|----------|--------|
| Demo recording (7 workflows) | P0 | Not started |
| Submission package | P0 | Not started |

## Task Progress
- **MVP Complete**: 34/34 (all S1–S11 + demo wiring + UI redesign)
- **Enterprise Streams**: 0/20 (S12–S16 planned, implementation starts next session)
- **WF6 Delta Detection**: 0/2 (S14-001, S14-002 — unblocked, ready for W6)
- **Demo/Submit**: 0/2
- **Grand Total**: 34/56 complete
- **Critical path**: S12-001 (ACAR routing) → S13-001 (tracing) → demo recording

## Enterprise Streams Overview

| Stream | System | Tasks | P0 | P1 | Goal |
|--------|--------|-------|----|----|------|
| **ACAR σ-Routing** | S12 | 3 | 1 | 2 | Make σ-routing real (currently hardcoded gpt-4o) |
| **Enterprise Governance** | S13 | 3 | 2 | 1 | OpenTelemetry + compliance dashboard + trace viewer |
| **CI/CD Templates** | S15 | 5 | 2 | 3 | Cosmos failures + verifier templates + ADO outbound |
| **Enterprise Budgeting** | S16 | 5 | 2 | 3 | Azure Cost Mgmt + org pools + chargeback + SignalR |
| **Spec Delta** | S14 | 2 | 0 | 2 | WF6: detect spec changes, surgical re-execution |

## New Azure Dependencies (To Install)

| Package | Stream | Purpose |
|---------|--------|---------|
| `@azure/monitor-opentelemetry` | S13 | OpenTelemetry → App Insights |
| `applicationinsights` | S16 | Auto-collection SDK |
| `@azure/arm-costmanagement` | S16 | Azure Cost Management queries |
| `@microsoft/signalr` | S16 | Azure SignalR Service SDK |
| `azure-devops-node-api` | S15 | ADO outbound operations |

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-11 | AGENTS.md as mandatory execution rules | Enforce multi-agent QA discipline |
| 2026-02-11 | Biome over ESLint + Prettier | Faster, single tool, less config |
| 2026-02-11 | Turborepo + npm workspaces | Per spec; proven pattern |
| 2026-02-11 | CHECKPOINT.md for cross-tool handoff | Claude Code ↔ Codex continuity |
| 2026-02-11 | Express for API (not Fastify) | Simpler, more ecosystem support |
| 2026-02-11 | Socket.IO for real-time (not Azure SignalR SDK) | No server-side Node.js SDK for Azure SignalR |
| 2026-02-11 | MSAL v2/v3 (not v5) for React auth | MSAL React v5 requires React 19 |
| 2026-02-11 | Sub-path export for sha256 | Avoid bundling node:crypto in Next.js client |
| 2026-02-11 | ADO for CI/CD failure intelligence | Strengthens Microsoft platform alignment |
| 2026-02-11 | Fixer as 5th agent role | Follows existing agent patterns; scoped to remediation |
| 2026-02-11 | Remediation creates NEW plan.lock | Preserves immutability; parentLockId links to original |
| 2026-02-11 | In-memory stores for MVP failure/remediation | Consistent with pattern; Cosmos upgrade path clear |
| 2026-02-11 | Professional dark theme (Linear/Vercel style) | Replace generic gray-950 with cohesive blue-tinted dark theme |
| 2026-02-11 | Enterprise adaptability as post-MVP goal | 4 streams transform prototype into enterprise-grade product |
| 2026-02-11 | σ-routing priority over all other streams | Core differentiator claim must have real implementation |

## Blockers
- None currently identified

## Risks
| Risk | Impact | Mitigation | Status |
|------|--------|------------|--------|
| ACAR claims without implementation | Credibility loss at judging | S12-001 is top priority for next session | **HIGH** |
| Azure Cost Management API latency | Budget dashboard stale | Fallback to token math + cache | Open |
| Azure SignalR migration breaking changes | Real-time downtime | Keep Socket.IO as fallback | Open |
| 20 new tasks in 2 weeks | Incomplete delivery | Parallel worktrees, P0 first | Open |
| Hackathon deadline (Mar 15) | Incomplete submission | P0 tasks achievable in 2 sessions | Medium |

## Test Counts
| Scope | Count |
|-------|-------|
| apps/web | 119 |
| apps/api | 181 |
| packages/foundry | 81 |
| packages/cosmos | 44 |
| packages/github-app | 24 |
| packages/shared | 4 |
| **Total** | **453** |
