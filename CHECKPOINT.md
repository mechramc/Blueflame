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
- **Last completed task**: S1-001 — Initialize Turborepo monorepo
- **Next task**: S1-002 — Azure Bicep templates, S1-003 — CI/CD, S1-005 — Shared types
- **Branch**: `main`
- **Repo is green**: YES (build, lint, test all pass)

## What Just Happened
- Created project conventions: `CLAUDE.md`, `CHECKPOINT.md`, `.gitignore`, `.env.example`
- Rewrote `AGENTS.md` with multi-agent execution rules, Agni learnings
- Restructured `docs/STATUS.md` as project dashboard
- **S1-001 COMPLETE**: Turborepo monorepo fully scaffolded
  - Root: `package.json`, `turbo.json`, `tsconfig.base.json`, `biome.json`
  - `apps/web`: Next.js 14 + React + Tailwind + Vitest (jsdom)
  - `apps/api`: Express + TypeScript + tsx (dev) + Vitest
  - `packages/shared`: Types + Zod + Result pattern
  - `packages/cosmos`: Cosmos DB wrapper (shell)
  - `packages/foundry`: Foundry SDK wrapper (shell)
  - `packages/github-app`: GitHub App client (shell)
  - All 6 packages: build, lint, test passing

## What To Pick Up Next
1. **S1-005**: Create shared TypeScript types (`packages/shared/src/types/`) — all domain models from spec
2. **S1-002**: Azure Bicep templates (`infra/`) — Cosmos DB, SignalR, Key Vault, Container Apps
3. **S1-003**: CI/CD pipelines (`.github/workflows/ci.yml`, `deploy.yml`)
4. **S1-004**: SignalR connection between web and api
5. **S2-001**: Entra ID authentication
6. Create GitHub issues from `github-issues.md` (27 issues)

## Blockers
- None

## Key Files to Read Before Starting
- `Blueflame-Spec-v3-ACAR.md` — source of truth (sections 13-14 for types, section 8 for infra)
- `tasks.yaml` — canonical task list with dependencies and acceptance criteria
- `AGENTS.md` — mandatory execution rules
- `CLAUDE.md` — conventions

## Test Counts
| Scope | Count |
|-------|-------|
| Total | 0 (scaffold phase — no domain logic yet) |

## Warnings for Next Tool
- `npm run dev` starts web on :3000 and api on :4000 via `npx turbo dev`
- Next.js 14 does NOT support `next.config.ts` — use `.mjs` extension
- Biome enforces LF line endings and tab indentation — run `npm run lint:fix` after creating files
- `--passWithNoTests` flag required in vitest commands for packages with no tests yet
- Verify `npm run dev` acceptance criteria: web on :3000 is confirmed by build; api :4000 needs manual dev run
