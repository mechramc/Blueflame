# CLAUDE.md — Blueflame Project Instructions

> These instructions are mandatory for all Claude Code sessions on this project.

## Project Overview

**Blueflame** is a governed AI software refinery that turns human intent into specs, then executes them via an authorized multi-agent swarm. Built for the Microsoft AI Dev Days hackathon (Feb 10 – Mar 15, 2026).

- **Repo**: `C:\Github\Blueflame` (main), worktrees: `Blueflame-api`, `Blueflame-web`, `Blueflame-infra`
- **Key files**: `Blueflame-Spec-v3-ACAR.md` (source of truth), `Blueflame-PRD.md`, `tasks.yaml`, `AGENTS.md`, `CHECKPOINT.md`, `docs/STATUS.md`
- **Hackathon**: Microsoft AI Dev Days (Feb 10 – Mar 15, 2026)

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 14 (App Router) + React + Tailwind CSS |
| Backend API | Node.js + TypeScript (Azure Container Apps) |
| Database | Azure Cosmos DB (7 containers) |
| Real-time | Azure SignalR Service |
| Auth | Microsoft Entra ID (SSO + 4-tier RBAC) |
| AI/Agents | Microsoft Foundry (10 services) |
| Source Control | GitHub (Actions, agentic DevOps, GitHub App) |
| Infrastructure | Azure (Bicep IaC) |
| Monorepo | Turborepo + npm workspaces |
| Testing | Vitest (unit), Playwright (E2E) |
| Linting | Biome (lint + format) |
| Validation | Zod (runtime), TypeScript strict (compile-time) |

## Monorepo Structure

```
apps/
  api/          # Backend API (Azure Container Apps)
  web/          # Frontend (Next.js on Azure Static Web Apps)
packages/
  shared/       # Shared types, Zod schemas, utilities
  cosmos/       # Azure Cosmos DB wrapper
  foundry/      # Microsoft Foundry SDK wrappers
  github-app/   # GitHub App client
infra/          # Bicep IaC templates
docs/           # Architecture, ADRs, QA reports, status
prompts/        # Agent system prompts (designer, planner, builder, verifier, explainer)
scripts/        # Automation scripts
```

## Commands

| Action | Command | Where |
|--------|---------|-------|
| Install deps | `npm install` | root |
| Dev (all) | `npx turbo dev` | root |
| Dev (web) | `npm run dev` | `apps/web` |
| Dev (api) | `npm run dev` | `apps/api` |
| Build | `npx turbo build` | root |
| Test | `npx turbo test` | root |
| Test (single app) | `npx vitest run --reporter=verbose` | `apps/web` or `apps/api` |
| Lint | `npx biome check .` | root |
| Lint fix | `npx biome check --fix .` | root |
| Typecheck | `npx turbo typecheck` | root |
| Infra deploy | `az deployment group create -f infra/main.bicep` | root |

## Code Conventions

### TypeScript
- **Strict mode**: `strict: true` in all tsconfig files, no `any`
- **Zod**: All external data (API responses, user input, env vars) validated with Zod
- **Result pattern**: `type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }`
- **No exceptions for control flow**: Use Result pattern, throw only for truly exceptional cases

### Naming
- **Files**: `kebab-case.ts` (e.g., `spec-engine.ts`, `plan-lock.ts`)
- **Types/Interfaces**: `PascalCase` (e.g., `OutputSpec`, `TaskPlan`, `PlanLock`)
- **Functions/Variables**: `camelCase` (e.g., `createSpec`, `lockPlan`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `MAX_BUDGET`, `COSMOS_DB_NAME`)
- **Cosmos containers**: lowercase (e.g., `specs`, `plans`, `locks`, `runs`, `agents`)

### Imports
- Prefer named imports over default imports
- Group: external deps > internal packages > relative imports (blank line between groups)
- Use `@blueflame/shared`, `@blueflame/cosmos`, etc. for cross-package imports

### Commit Format
```
<type>(<scope>): <description>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```
Types: `phase`, `qa`, `fix`, `docs`, `refactor`, `test`, `chore`
Scopes: `s1`..`s10` (system), phase name, or app name

## Testing

### Setup Per App
| App | Framework | Config | DOM |
|-----|-----------|--------|-----|
| `apps/web` | Vitest | `vitest.config.ts` | jsdom |
| `apps/api` | Vitest | `vitest.config.ts` | none |
| `packages/*` | Vitest | `vitest.config.ts` | none |

### Testing Rules
- Every new module gets a test file: `foo.ts` → `foo.test.ts` (colocated)
- Happy path + at least 3 edge cases per function
- Mock external services (Cosmos, Foundry, GitHub) — never hit real APIs in tests
- Coverage target: >= 80%
- Test names: `it('should <expected behavior> when <condition>')`

## Worktree Strategy (Parallel Development)

### Naming Convention
```
C:\Github\Blueflame         # main
C:\Github\Blueflame-api     # apps/api work
C:\Github\Blueflame-web     # apps/web work
C:\Github\Blueflame-infra   # infra/ work
C:\Github\Blueflame-pkg     # packages/* work
```

### Rules
- Run 3-5 parallel agents on separate worktrees simultaneously
- Each agent gets full context: spec references, shared types, conventions
- Read all relevant source files BEFORE launching agents
- Include test requirements in agent prompts
- Use `run_in_background: true` for parallel execution, `TaskOutput` to collect results

### Merge Protocol
- Feature branches may conflict — always `git stash` before merging, `git stash pop` after
- Use `git checkout --theirs` for feature branch files when that branch has latest code
- Run full test suite after every merge: `npx turbo test`

## Do's and Don'ts

### Do
- Start every non-trivial task with plan mode (`/plan`)
- Read existing code before modifying it
- Validate all external data with Zod schemas
- Keep Cosmos DB operations in `packages/cosmos` — never import `@azure/cosmos` directly in apps
- Keep Foundry operations in `packages/foundry` — never import Foundry SDK directly in apps
- Update `docs/STATUS.md` after completing any phase
- Write a QA report after every phase (`docs/qa/<phase>_qa_report.md`)
- Cross-check `CHECKPOINT.md` blockers against `docs/STATUS.md` at session start
- Flag blockers immediately — never let "Blockers: None" stand when issues exist

### Don't
- Don't commit secrets (`.env`, API keys, connection strings)
- Don't use `any` — use `unknown` + Zod parse or proper types
- Don't skip QA — every phase needs a QA report
- Don't use background agents for multi-file creation tasks (they fail; see lessons below)
- Don't declare features "done" based only on tests passing — verify mounted, wired, reachable
- Don't add dependencies without checking if Turborepo/existing packages already provide it
- Don't modify `plan.lock.json` files — they are immutable by design
- Don't use `npm audit fix --force` — check implications first

## Lessons from Agni (Apply Here)

### Background Agents Often Fail on Multi-File Tasks
Agents may produce incomplete output, duplicate files, or get stuck on user approval.
- **Use agents only for**: research/exploration, single-file tasks, validation/testing
- **For multi-file creation**: write files sequentially in main context

### Functional Completeness Checklist
A feature is NOT done until ALL of these are true:
1. **Mounted**: Component is imported and rendered in the app's component tree
2. **Wired end-to-end**: All layers connected (API route → service → Cosmos → type)
3. **Reachable by user**: User can navigate to and interact with the feature
4. **Connected to context**: Feature is aware of its environment (auth, project, run state)
5. **Verified by running the app**: Ask user to confirm — never declare done from tests alone

### Proactive Blocker Reporting
- Always cross-check CHECKPOINT.md blockers against STATUS.md at session start
- If STATUS.md "Blockers" section is stale, update it before other work
- Report blockers to user immediately, don't wait to be asked

### Session Continuity
- Update `CHECKPOINT.md` at end of every session
- Include: session number, what was done, what's next, blockers, test counts
- This is the handoff document between sessions

## Environment Variables

See `.env.example` for all required variables. Key groups:
- **Azure**: subscription, resource group, Cosmos DB, SignalR, Key Vault
- **Entra ID**: client ID, tenant ID, client secret
- **GitHub**: token, app ID, private key
- **Foundry**: API key, endpoint
- **App**: API URL, Node env

## Known Issues / Gotchas

- GitHub may return 500 on first push attempt — retry usually works
- CRLF warnings on Windows are cosmetic
- Azure Cosmos DB emulator available for local dev (reduces Azure costs)
- Foundry SDK may need specific Node.js version — check compatibility
- Bicep CLI must be installed separately (`az bicep install`)
