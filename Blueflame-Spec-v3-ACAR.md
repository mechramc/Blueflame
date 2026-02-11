# BLUEFLAME

**An Interactive Software Refinery with Governed Agent Execution**

**Microsoft AI Dev Days Hackathon — Full Technical Specification v3**

February 10 – March 15, 2026

*Built on Microsoft Foundry • Azure • GitHub • Microsoft Agent Framework*

**Theoretical Foundation:** *ACAR: Adaptive Complexity Routing for Multi-Model Ensembles (Kumaresan, 2026)*

### Target Prize Categories

- 🏆 Grand Prize: Build AI Applications & Agents using Microsoft AI Platform
- 🤝 Best Multi-Agent System
- 🏢 Best Enterprise Solution
- 🏗️ Best Use of Microsoft Foundry

---

## Table of Contents

**Part I — Vision & Strategy**
1. Executive Summary
2. The Problem & The Thesis
3. ACAR: Theoretical Foundation
4. Hackathon Alignment & Target Categories

**Part II — Architecture**
5. Architecture Overview — Microsoft Native Stack
6. Microsoft Foundry Integration (Deep Dive)
7. Multi-Agent System Design (ACAR-Informed)
8. Azure Services Map
9. GitHub Integration & Agentic DevOps
10. CI/CD Failure Intelligence (Azure DevOps)

**Part III — Core Experience**
11. The Six Stages (Core Refinement Loop)
12. Multi-Entry Architecture
13. Supported Workflows (7 Scenarios)

**Part IV — Data, Governance & Observability**
14. Artifact Model & Data Architecture
15. Constraint System (Project-Level Registry)
16. Enforcement, Safety & Responsible AI
17. Budget System & Partial Execution
18. Spec Delta Detection & Controlled Rebuild
19. Observability & Audit Trail

**Part V — Execution Plan**
20. Technology Stack Summary
21. Implementation Roadmap (6-Week Sprint Plan)
22. Demo Strategy & Scenario
23. Enterprise Upgrade Paths
24. Judging Criteria Alignment

---

# PART I — VISION & STRATEGY

---

## 1. Executive Summary

Blueflame is an interactive software refinery that transforms human intent into explicit specifications, then executes them through a governed swarm of AI agents operating under strict authorization, constraints, and budgets.

For the Microsoft AI Dev Days Hackathon, Blueflame is built entirely on the Microsoft native ecosystem: Microsoft Foundry as the AI backbone, Azure for infrastructure, GitHub for code execution and agentic DevOps, and Microsoft Agent Framework for multi-agent orchestration.

> **[THESIS]** Software should be refined, not generated. AI is not the source of truth. AI is the executor of authorized intent.

Blueflame is grounded in original research. Its multi-model routing, verification, and attribution architecture is derived from the ACAR framework (Adaptive Complexity & Attribution Routing), a measurement methodology validated across 7,550+ auditable runs on four benchmarks. ACAR's key finding — that self-consistency variance (σ) can route tasks across execution modes while avoiding full ensembling on 54% of tasks — directly informs how Blueflame's Foundry Model Router allocates compute.

The system supports seven distinct workflows from greenfield builds to CI/CD failure remediation, all following a consistent model: **Chat → Spec → Approve → Agents Execute → PRs → Review.**

---

## 2. The Problem & The Thesis

### 2.1 The Problem

Modern AI development tools either assist developers superficially without understanding intent, or attempt full autonomy without sufficient control, transparency, or safety. In both cases, engineering intent is not treated as a first-class artifact. Requirements drift. Architectural decisions erode silently. AI-generated work is difficult to trust or audit. Developers either micromanage AI or lose control entirely.

### 2.2 The Blueflame Thesis

Great software emerges from human intent expressed through dialogue, crystallized into explicit specifications, authorized before execution, executed by bounded and observable agents, and continuously reviewed and refined.

> **[THESIS]** AI is not the source of truth. AI is the executor of authorized intent.

### 2.3 What Blueflame Is (and Is Not)

| Blueflame IS | Blueflame IS NOT |
|---|---|
| A spec-first SDLC system | A copilot replacement |
| An interactive refinement environment | A fully autonomous coding agent |
| A governed multi-agent platform with ACAR-informed routing | A black-box AI factory |
| Human-in-the-loop by design | A no-code builder |
| Multi-entry (chat, document upload, codebase-context) | A chat-only tool |
| Research-grounded (7,550+ auditable runs) | Unvalidated vaporware |

---

## 3. ACAR: Theoretical Foundation

Blueflame's multi-model orchestration is not ad-hoc. It is grounded in ACAR (Adaptive Complexity & Attribution Routing), a measurement framework for multi-model routing developed by the author and validated with empirical results across 1,510 tasks and 7,550+ auditable runs.

### 3.1 What ACAR Proved

ACAR uses self-consistency variance (σ) computed from N=3 samples to estimate task difficulty and route tasks across single-model, two-model, and three-model execution modes. Key findings:

| Finding | Result | Blueflame Application |
|---|---|---|
| σ-based routing exceeds naive multi-model baselines | 55.6% accuracy vs. 54.4% (Arena-2) at 1.5% lower cost | Foundry Model Router uses σ-informed routing to allocate compute per task |
| 54.2% of tasks avoid full ensembling | Easy tasks (where models agree) route to single-model execution | Builder agents on simple tasks use one model; complex tasks escalate to multi-model verification |
| Retrieval without semantic alignment hurts (-3.4pp) | Median similarity was 0.167; noise injection degraded accuracy | Foundry IQ enforces similarity threshold >0.7 for RAG grounding; low-quality context is filtered |
| Agreement-but-wrong is unrecoverable | When σ=0 but models are wrong, no ensemble recovers | Verifier agent uses acceptance criteria (not just model agreement) as ground truth, bypassing this ceiling |
| Attribution requires counterfactual computation | Proxy signals (similarity, entropy) show weak correlation with ground-truth LOO | Explainer agent uses explicit diff-based attribution (what changed, what passed) rather than proxy estimation |

### 3.2 ACAR → Blueflame Mapping

ACAR was built on TEAMLLM, a deterministic execution substrate with immutable artifacts and complete decision traces. Blueflame extends this to a production system:

| ACAR/TEAMLLM Concept | Blueflame Implementation |
|---|---|
| Self-consistency variance (σ) for routing | Foundry Model Router with σ-informed task difficulty estimation; complex tasks escalate to multi-model, simple tasks use single-model |
| Deterministic execution substrate | Cosmos DB with immutable plan.lock.json, SHA-256 spec hashes, append-only run traces |
| Immutable artifacts + decision traces | Foundry Tracing (OpenTelemetry) + Cosmos DB change feed; every agent action traced |
| Forward-only state transitions | Run state machine: PENDING → AUTHORIZED → EXECUTING → PAUSED → COMPLETED (no rollback) |
| Model-agnostic routing | Foundry Model Router is provider-independent; σ depends only on answer equivalence, not model-specific behavior |
| Auditable runs (7,550+ in paper) | Every Blueflame run produces a complete audit artifact; all figures and decisions regenerable |

### 3.3 Why This Matters for the Hackathon

Most hackathon entries use AI without measurement. Blueflame is backed by a peer-quality research paper with empirical results, falsifiable baselines, and documented negative results. The ACAR paper demonstrates what the author reports honestly when things don't work (retrieval hurt, attribution proxies failed) — intellectual rigor that adds credibility beyond what a typical "builder" entry can offer.

> **[DIFFERENTIATOR]** Blueflame is not just a project. It is a research-informed system with 7,550+ auditable runs proving its routing and verification assumptions.

---

## 4. Hackathon Alignment & Target Categories

### 4.1 Grand Prize: Build AI Applications & Agents

Blueflame is a production-grade AI application that uses Microsoft's AI platform to solve a real-world problem. It demonstrates innovative use of Microsoft Foundry, Azure, and GitHub with six supported scenarios and a research-validated routing architecture (ACAR).

### 4.2 Best Multi-Agent System

Blueflame implements a governed multi-agent swarm using Microsoft Agent Framework with four specialized roles (Planner, Builder, Verifier, Explainer) orchestrated via Foundry Agent Service. It uses A2A protocol for inter-agent communication, MCP servers for tool integration, and ACAR-informed σ-based routing for model allocation. The fifth agent role (Fixer) extends the swarm to CI/CD failure remediation. The multi-agent architecture is grounded in empirical results from 1,510 tasks across four benchmarks.

### 4.3 Best Enterprise Solution

Blueflame is built enterprise-first: Azure Entra ID authentication, RBAC-governed agent permissions, Azure Policy enforcement, full audit logging, cost governance with partial execution, a persistent constraint registry, CI/CD failure intelligence with Azure DevOps integration, documented enterprise upgrade paths, and responsible AI guardrails including Foundry Content Safety and Protected Material Detection for code generation safety.

### 4.4 Best Use of Microsoft Foundry

Foundry is the central nervous system. Model routing, agent orchestration, workflow management, knowledge grounding, content safety, tracing, evaluation, failure analysis, and the control plane all run through Foundry natively. Blueflame uses 11 distinct Foundry services.

### 4.5 Judging Criteria Alignment

| Criterion | Blueflame Strength |
|---|---|
| Innovation | Spec-first SDLC with ACAR-informed routing (research-validated), authorization gates, constraint registry, and delta-aware re-execution. Backed by 7,550+ auditable runs. |
| Impact | Solves enterprise trust deficit in AI-generated code. Six real-world workflows. Cost governance prevents runaway spend. Full audit trail enables compliance. |
| Technical Usability | 3 entry points, progressive 6-stage UX, GitHub PRs for review (zero new tools), real-time dashboard, graceful budget-constrained partial execution. |
| Platform Alignment | 100% Microsoft-native: 10 Foundry services, 12 Azure services, full GitHub integration. Multi-model via Foundry Model Router with ACAR σ-routing. |

---

# PART II — ARCHITECTURE

---

## 5. Architecture Overview — Microsoft Native Stack

### 5.1 Three-Layer Architecture

**Presentation Layer:** React/Next.js frontend hosted on Azure Static Web Apps. Azure SignalR Service for real-time agent execution streaming. Monaco Editor for spec editing. Document upload zone for PRDs, RFCs, and tickets.

**Intelligence Layer (Microsoft Foundry):** Microsoft Foundry is the agent factory: managing model selection (via σ-informed Model Router), agent lifecycle, workflow orchestration, knowledge grounding (Foundry IQ with similarity thresholds informed by ACAR's retrieval findings), content safety, and governance.

**Infrastructure Layer (Azure + GitHub):** Azure Cosmos DB for spec/artifact/constraint storage. Azure Blob Storage for run archives. GitHub for branch-based code execution via GitHub Actions (agentic DevOps). Azure Key Vault for secrets. Azure Monitor for observability. Azure Entra ID for authentication and RBAC. Azure Functions for event-driven orchestration.

### 5.2 Component Mapping

| Blueflame Concept | Microsoft Service | ACAR Lineage |
|---|---|---|
| Conversational Design | Foundry Agent Service + Azure OpenAI | N/A — new in Blueflame |
| Document Ingestion | Foundry IQ + Foundry Agent | N/A — new in Blueflame |
| σ-Informed Model Routing | Foundry Model Router | ACAR σ-based routing (55.6% accuracy, 54.2% compute savings) |
| Constraint Registry | Cosmos DB + Verifier Agent | ACAR acceptance criteria as ground truth (bypasses agreement-but-wrong) |
| RAG with Similarity Threshold | Foundry IQ (Azure AI Search) | ACAR retrieval finding: threshold >0.7 required; median 0.167 caused -3.4pp |
| Agent Swarm | Foundry Agent Service + Agent Framework | ACAR execution modes: single → lite → full, mapped to task σ |
| Deterministic Artifacts | Cosmos DB (immutable plan.lock) | TEAMLLM immutable artifacts + forward-only state transitions |
| Attribution/Explanation | Explainer Agent + Foundry Tracing | ACAR attribution finding: explicit diffs, not proxy estimation |
| Code Execution | GitHub Actions + Repos | Agentic DevOps: branch → build → test → PR pipeline |
| Cost Governance | Foundry Control Plane + Azure Cost Mgmt | ACAR cost-accuracy Pareto frontier; budget-bounded execution |
| Content Safety | Foundry Content Safety + Protected Material Detection | Enterprise-grade: PII detection, licensed code prevention |
| Governance | Foundry Control Plane + Azure Policy | Input/output safety, prompt hygiene, tool call guards |

---

## 6. Microsoft Foundry Integration (Deep Dive)

### 6.1 Foundry as the Agent Factory

Microsoft Foundry is Blueflame's central intelligence platform. Every AI operation flows through Foundry, providing unified model access, agent orchestration, governance, and observability in a single management plane.

### 6.2 Foundry Services Used (11 Services)

| Foundry Service | Blueflame Usage |
|---|---|
| Foundry Models | Access to GPT-4o, o1 (complex reasoning/planning), GPT-4o-mini (fast verification), Claude Sonnet 4.5 (code generation). Model-agnostic by design — σ-routing works regardless of provider. |
| Foundry Model Router | ACAR-informed routing: σ computed from N=3 samples determines execution mode. σ=0 (agreement) → single model. σ=0.5 (partial) → two models. σ=1.0 (all differ) → full ensemble. Cost optimization up to 50%. |
| Foundry Agent Service | Hosts all 4 Blueflame agent roles. Manages conversation state, tool calls, safety filters, identity, and observability. MCP and A2A protocol support. |
| Foundry Workflows | Three patterns: (1) Sequential for spec → PRD → tasks. (2) Parallel for multi-agent execution. (3) Human-in-the-loop with approval nodes at authorization gates. |
| Foundry IQ (Azure AI Search) | RAG engine with ACAR-informed similarity threshold (>0.7). Grounds agents on codebase, specs, constraints, and uploaded documents. Low-quality retrievals filtered. |
| Foundry Knowledge Base | Connects agents to Azure Blob (specs), GitHub (code), Cosmos DB (artifacts, constraints) via single endpoint. |
| Foundry Control Plane | Centralized identity (Entra Agent ID), policy enforcement, input/output safety, tool call authorization, cost guardrails, budget-pause triggers. |
| Foundry Content Safety | Input filters (prompt injection, PII detection). Output filters (content safety, Protected Material Detection for code — prevents agents from generating unlicensed/copyrighted code snippets). |
| Foundry Tracing | OpenTelemetry-based tracing of every agent action, model call, tool invocation, and reasoning step. Feeds into Azure Monitor. |
| Foundry Evaluation | Automated benchmarking against acceptance criteria. Pre-built templates for code quality, test coverage, constraint compliance. Custom evaluators for spec adherence. |
| Foundry Agent (Failure Analyzer) | CI/CD failure root cause analysis and remediation plan generation. Reads normalized failure schema, pipeline logs, and codebase context. Produces structured remediation DAG. |

### 6.3 Model Selection Strategy (σ-Informed)

Blueflame's model selection is grounded in ACAR's findings. Rather than using opaque "best model" logic, the Foundry Model Router uses σ-based task difficulty estimation to allocate models. This is model-agnostic by design — ACAR demonstrated that σ depends only on answer equivalence, not on provider-specific behavior.

| Task Type | Primary Model | Fallback | σ Routing |
|---|---|---|---|
| Conversational Design | GPT-4o | Claude Sonnet 4.5 | N/A (always interactive) |
| Document Parsing | o1 | GPT-4o | σ computed on extraction quality |
| Spec Generation | o1 | GPT-4o | σ computed on spec completeness |
| Code Generation | Claude Sonnet 4.5 | GPT-4o | σ=0 → single; σ=0.5 → two; σ=1.0 → full ensemble |
| Bug Reproduction | Claude Sonnet 4.5 | GPT-4o | σ on reproduction consistency |
| Test Generation | Claude Sonnet 4.5 | GPT-4o | σ on test validity |
| Constraint Verification | GPT-4o-mini | GPT-4o | Always single-model (deterministic checks) |
| Root Cause Explanation | GPT-4o | Claude Sonnet 4.5 | N/A (synthesis task) |
| Planning/Decomposition | o1 | Claude Sonnet 4.5 | σ on task decomposition consistency |
| Spec Delta Analysis | GPT-4o | GPT-4o-mini | Always single-model (diff computation) |

> **[COST]** ACAR demonstrated 70% cost reduction on easy tasks while maintaining quality floors. Blueflame inherits this through σ-informed routing via Foundry Model Router.

---

## 7. Multi-Agent System Design (ACAR-Informed)

### 7.1 Agent Architecture (5 Roles)

Blueflame's agent architecture extends ACAR's execution modes into a governed swarm. Each agent role has a precise responsibility boundary, dedicated toolset, and strict constraints. The Verifier and Explainer roles are direct implementations of ACAR's verification and attribution methodology. The Fixer role extends the architecture to handle CI/CD failure remediation (Section 10).

| Role | Responsibility | Model | Tools (via MCP) | ACAR Lineage |
|---|---|---|---|---|
| Planner | Task decomposition, DAG construction, σ-based effort estimation, agent role assignment | o1 | GitHub API (read), Cosmos DB (read), Foundry IQ | ACAR task difficulty estimation |
| Builder | Code implementation, branch management, PR creation. Bug-fix: reproduce, fix, add regression tests. | Claude Sonnet 4.5 | GitHub API (write), Foundry IQ, MCP Code Server, Runtime/Debug MCP | ACAR execution modes (single/lite/full based on task σ) |
| Verifier | Test execution, constraint validation, acceptance checking. Uses acceptance criteria as ground truth — not just model agreement. | GPT-4o | GitHub Actions (trigger), Test Runner MCP, Linter MCP, Cosmos DB (constraints, read-only) | ACAR finding: agreement-but-wrong is unrecoverable → Verifier uses criteria, not consensus |
| Explainer | Root cause analysis, decision rationale, PR descriptions. Uses explicit diffs and test results, not proxy estimation. | GPT-4o | Foundry Tracing (read), Cosmos DB (read), GitHub Diff API, Foundry Evaluation results | ACAR finding: proxy attribution fails → Explainer uses counterfactual diffs |
| Fixer | CI/CD failure analysis, remediation planning. Reads pipeline logs and test results, produces root cause analysis and remediation task DAG. | GPT-4o + Claude Sonnet 4.5 | ADO REST API (read), GitHub API (read), Foundry IQ, Cosmos DB (failures, read) | ACAR σ-routing applied to remediation task difficulty |

### 7.2 Verifier Agent: Beyond Agreement (ACAR-Informed)

ACAR's most important negative result was the "agreement-but-wrong" failure: when all models agree on an incorrect answer (σ=0), no downstream ensemble can recover. This represents an 8pp accuracy ceiling for any self-consistency-based system.

Blueflame's Verifier agent addresses this by design. Rather than relying on model agreement as the verification signal, the Verifier evaluates agent outputs against explicit acceptance criteria from the Output Spec and constraints from the project-level registry. This means the Verifier can catch failures even when all models "agree" — because the ground truth is the spec, not the models.

> **[INSIGHT]** ACAR proves self-consistency alone is insufficient. Blueflame's Verifier uses spec-defined acceptance criteria as ground truth, bypassing the agreement-but-wrong ceiling.

### 7.3 Explainer Agent: Explicit Attribution (ACAR-Informed)

ACAR attempted to estimate model contribution using proxy signals (response similarity, entropy, agreement patterns). These proxies showed weak correlation with ground-truth leave-one-out attribution. The conclusion: practical attribution requires explicit counterfactual computation.

Blueflame's Explainer agent implements this by using explicit, observable signals: Builder code diffs (what changed), Verifier test results (what passed/failed), Foundry Tracing (the reasoning chain), and the original Output Spec (the intent). This produces attribution that is auditable and trustworthy because it is based on actual system state, not statistical estimation.

### 7.4 Orchestration Pattern

**Phase 1: Sequential Planning.** Planner receives plan.lock.json, decomposes tasks into a DAG, estimates per-task σ (using ACAR's self-consistency sampling), identifies parallelizable work, and assigns agent roles and model allocations.

**Phase 2: Parallel Execution.** Builder agents spawn concurrently for independent tasks. σ-routing determines model allocation per task: simple tasks (σ=0) use single-model; complex tasks (σ=1.0) use multi-model with ensemble verification. Each Builder operates on its own Git branch. Verifier agents run after each Builder completes, using acceptance criteria as ground truth.

**Phase 3: Sequential Consolidation.** All branches converge into Pull Requests. Verifier runs integration-level checks. Explainer generates consolidated run summary with explicit attribution.

### 7.5 Inter-Agent Communication

| Protocol | Usage | Example |
|---|---|---|
| A2A (Agent-to-Agent) | Structured handoff between roles | Builder signals completion with branch ref → Verifier receives and validates |
| MCP (Model Context Protocol) | External tool access via registered servers | Builder uses Code Server MCP; Verifier uses Test Runner MCP |
| Foundry Knowledge Base | Shared read-only knowledge plane | All agents query codebase, specs, constraints via single endpoint |
| Cosmos DB Change Feed | Event-driven state transitions | Agent status update triggers Azure Function → next workflow step |

### 7.6 Agent Identity & Security

Each agent receives a scoped Entra Agent ID via Foundry Control Plane. Agent identities carry only the permissions required for their role. All tool calls are logged with agent identity, timestamp, and result. Agent identities are project-scoped.

---

## 8. Azure Services Map

### 8.1 Complete Azure Service Usage (13 Services)

| Azure Service | Blueflame Usage | Tier |
|---|---|---|
| Azure Cosmos DB (NoSQL) | Specs, artifacts, run state machine, plan locks, constraint registry, agent state | Serverless |
| Azure Blob Storage | Run archives, uploaded documents (PRDs, RFCs) | Hot tier |
| Azure Static Web Apps | Frontend hosting (React/Next.js) | Standard |
| Azure SignalR Service | Real-time agent execution streaming, dashboard updates | Standard |
| Azure Functions | Event-driven glue: Cosmos change feed, GitHub webhooks, budget-pause logic | Consumption |
| Azure Key Vault | GitHub tokens, Foundry API keys, connection strings | Standard |
| Azure Monitor + Log Analytics | Unified observability: agent traces, cost metrics, constraint evaluations | Pay-as-you-go |
| Azure Entra ID | User SSO, 4-tier RBAC (Viewer, Editor, Authorizer, Admin), Entra Agent ID | P1 |
| Azure AI Search (via Foundry IQ) | RAG index with ACAR-informed >0.7 similarity threshold | Basic |
| Azure Container Apps | Backend API hosting (Node.js/Python) | Consumption |
| Azure Cost Management | Budget alerts, per-run cost tracking, anomaly detection | Included |
| Azure Policy | Governance: agent constraints, model allowlists, region restrictions, PII filters | Included |
| Azure DevOps | CI/CD failure intelligence: pipeline failure capture, test results API, service hooks, pipeline re-run | Basic |

---

## 9. GitHub Integration & Agentic DevOps

GitHub integration is central to Blueflame and directly targets the hackathon's Agentic DevOps grand prize track.

### 9.1 GitHub as the Execution Plane

All agent-generated code flows through GitHub. No code is ever executed or merged outside of the Git workflow. This gives Blueflame full auditability, rollback capability, and compatibility with existing team workflows.

| GitHub Feature | Blueflame Usage | Agentic DevOps Value |
|---|---|---|
| GitHub Repositories | Target project repos where agent code is committed | Standard enterprise Git workflow |
| GitHub Branches | Each Builder creates `blueflame/run-{id}/task-{n}` | Isolation per agent task |
| GitHub Pull Requests | All agent work as PRs with Explainer descriptions + spec traceability | Review interface developers already know |
| GitHub Actions | CI/CD triggered by Verifier: automated tests, linting, coverage | **THE "money shot": agent calls Action, gets results, reports to swarm** |
| GitHub Apps | Blueflame installs with scoped permissions (branch, PR, Actions, Diff) | Zero-trust: agents get only what they need |
| GitHub Webhooks | PR status, CI results, review events flow back via Azure Functions | Closed-loop agent ↔ CI feedback |

### 9.2 The Agentic DevOps Loop (Demo Focus)

This is the sequence judges need to see:

1. Builder agent creates a branch and writes code.
2. Builder opens a PR.
3. Verifier agent triggers a GitHub Action to run tests.
4. GitHub Actions executes the test suite.
5. Verifier receives CI results via webhook.
6. Verifier evaluates results against acceptance criteria.
7. If tests fail, Verifier reports back to Builder via A2A for targeted fix.
8. Explainer generates PR description with full traceability.
9. Human reviews and merges.

> **[DEMO]** When the Verifier agent calls a GitHub Action to run tests and then reports back to the swarm — that is the agentic DevOps moment that wins the category.

### 9.3 Branch Strategy

Every run creates a run branch. Task branches fork from it. PRs go from task branches to run branch. A final PR from run branch to target branch requires human merge approval. Agents never merge. For spec-change rebuilds (Workflow 6), unaffected branches are preserved.

---

## 10. CI/CD Failure Intelligence (Azure DevOps)

### 10.1 Why Failure Intelligence

CI/CD failures are the most expensive form of developer interruption. A test failure in a 30-minute pipeline blocks the entire team until someone investigates, diagnoses, fixes, and re-runs. Blueflame extends its governed agent architecture to treat CI/CD failures as first-class events: failures are captured, normalized, analyzed by AI agents, and remediated through the same authorization-gated process as any other execution.

Azure DevOps (ADO) serves as the sensor and execution plane. Blueflame is the governance and decision layer. This separation preserves the principle that agents operate on normal engineering surfaces (pipelines, branches, PRs) while governance remains centralized.

> **[THESIS]** CI/CD failures are not interruptions — they are structured inputs to a governed remediation loop.

### 10.2 Azure DevOps as Sensor Plane

| ADO Component | Blueflame Usage |
|---|---|
| Azure Pipelines | CI/CD execution with webhook notifications on failure |
| Service Hooks | Push failure events to Blueflame API endpoint |
| Pipeline Logs | Structured log extraction for root cause analysis |
| Work Items | Optional: link remediation runs to ADO work items |
| Test Results API | Structured test failure data (name, stack trace, duration) |
| Git Integration | Branch/PR operations for remediation code delivery |

### 10.3 Normalized Failure Schema

All CI/CD failures — whether from Azure DevOps, GitHub Actions, or future providers — are normalized into a provider-agnostic schema before analysis.

| Field | Type | Description |
|---|---|---|
| failureId | String | Unique ID (FAIL-{runId}-{seq}) |
| source | Enum | azure-devops \| github-actions |
| pipelineId | String | ADO pipeline ID or GitHub workflow name |
| buildNumber | String | Build/run number from CI provider |
| failureType | Enum | test \| build \| lint \| deploy \| timeout \| infrastructure |
| failedSteps[] | Array | Step name, exit code, log excerpt, duration |
| testResults | Object | Total, passed, failed, skipped; per-test details |
| environment | Object | OS, runtime version, node version, relevant env vars |
| branchRef | String | Source branch that triggered the failure |
| commitSha | String | Commit SHA that triggered the failure |
| timestamp | ISO 8601 | When the failure occurred |
| rawLogUrl | String | Link to full pipeline log |
| ttl | Number | Time-to-live in seconds (default: 30 days) |

### 10.4 Failure Analyzer Agent (5th Agent Role)

The Failure Analyzer extends Blueflame's agent architecture with a new specialized role. It follows the same patterns as existing agents: Foundry-hosted, scoped permissions, governed by plan.lock, observable via tracing.

| Attribute | Detail |
|---|---|
| Role | Fixer |
| Model | GPT-4o (root cause analysis), Claude Sonnet 4.5 (code remediation) |
| Inputs | Normalized failure record, pipeline logs, source code context (via Foundry IQ), constraint registry |
| Outputs | Root cause analysis, remediation plan (task DAG), confidence score |
| Tools (via MCP) | ADO REST API (read logs, test results), GitHub API (read diffs), Foundry IQ (codebase context) |
| Constraints | Read-only access to ADO; code changes flow through Builder agents under remediation PlanLock |

### 10.5 Remediation Loop

The remediation loop follows the same governance model as standard execution. No agent modifies code without an authorized plan.lock.

```
ADO Pipeline Fails
  → Service Hook → Blueflame API
    → Normalize to Failure Schema
      → Store in Cosmos (failures container)
        → Failure Analyzer: root cause + remediation plan
          → User reviews remediation plan
            → Authorization Gate (new plan.lock with parentLockId)
              → Builder agents execute fixes
                → Verifier validates via ADO pipeline re-run
                  → Explainer documents what failed and why
```

| Step | Service | Governance |
|---|---|---|
| 1. Capture | ADO Service Hooks → Blueflame API | Webhook signature verification |
| 2. Normalize | Blueflame API | Provider-agnostic schema |
| 3. Analyze | Failure Analyzer (Foundry Agent) | Scoped read-only access |
| 4. Plan | Remediation plan (task DAG) | σ-informed cost estimates |
| 5. Authorize | New plan.lock (parentLockId links to original) | Requires Blueflame:Authorizer role |
| 6. Execute | Builder + Verifier agents | Same constraints as standard execution |
| 7. Validate | ADO pipeline re-run | CI must pass before PR |
| 8. Document | Explainer agent | Root cause + fix attribution |

> **[ENFORCEMENT]** Remediation creates a NEW plan.lock linked to the original via parentLockId. The original lock is never modified. This preserves immutability while maintaining a complete audit trail.

### 10.6 ADO ↔ GitHub Interplay

Blueflame supports both GitHub Actions and Azure DevOps Pipelines as CI/CD providers. The failure intelligence layer normalizes across both:

| Capability | GitHub Actions | Azure DevOps |
|---|---|---|
| Failure capture | Webhook (workflow_run.completed) | Service Hook (build.complete) |
| Log extraction | REST API (getWorkflowRunLogs) | REST API (timeline + logs) |
| Test results | Parsed from logs | Test Results API (structured) |
| Code delivery | PR to GitHub repo | PR to ADO repo or GitHub repo |
| Pipeline re-run | Actions re-trigger | Pipeline queue API |

---

# PART III — CORE EXPERIENCE

---

## 11. The Six Stages (Core Refinement Loop)

Blueflame is a progressive refinement loop. Each stage is a hard gate. All six workflows follow this structure.

> **[DESIGN]** Chat → Spec → Approve → Agents Execute → PRs → Review. Every workflow, every time.

### Stage 1 — Intent Capture

Three entry points (Section 12): conversational chat, document upload, or codebase-context. All converge at Stage 2.

| Component | Service | Details |
|---|---|---|
| Chat Interface | React + Azure SignalR | Real-time streaming chat |
| Designer Agent | Foundry Agent Service (GPT-4o) | Requirement elicitation, ambiguity detection |
| Document Ingestion | Foundry IQ + Agent (o1) | Parse PRDs/RFCs into structured intent; flag gaps |
| Codebase Context | Foundry IQ (Azure AI Search) | Index repo with >0.7 similarity threshold (ACAR-informed) |
| Constraint Loading | Cosmos DB (constraints container) | Auto-load project-level constraints |

### Stage 2 — Output Specification

| Field | Type | Description |
|---|---|---|
| deliverables[] | Array | What must exist at completion |
| acceptance_criteria[] | Array | Testable conditions with unique IDs for traceability |
| constraints.must[] | Array | Hard requirements |
| constraints.must_not[] | Array | Prohibited actions |
| non_goals[] | Array | Explicitly out of scope |
| risks[] | Array | Identified risks with mitigations |
| definition_of_done | String | Completion statement |
| inherited_constraints[] | Array (auto) | From project-level constraint registry |

### Stage 3 — Derivation (Planning)

Planner agent derives PRD, task DAG with dependencies, acceptance mappings (task → criteria IDs), and σ-informed cost estimates. All drafts until approved.

### Stage 4 — Authorization (Hard Gate)

| Action | Service | Details |
|---|---|---|
| Spec Freeze | Cosmos DB | SHA-256 hash computed; document immutable |
| Plan Lock | Cosmos DB | plan.lock.json: frozen spec hash, tasks, budgets, constraint snapshot, agent permissions |
| Budget Allocation | Foundry Control Plane | User sets ceiling; per-agent limits derived from σ-informed estimates |
| Permission Grant | Entra Agent ID + GitHub App | Scoped identities: branch-write + PR-create for this run only |
| RBAC Check | Azure Entra ID | Requires Blueflame:Authorizer role |

> **[ENFORCEMENT]** Without a valid plan.lock.json referencing the current spec hash and signed by an authorized user, no agent may be spawned.

### Stage 5 — Governed Agent Execution

Bounded swarm via Foundry Agent Service. σ-routing allocates models per task. Real-time dashboard shows agent status, cost burn-down, task progress. Budget System (Section 17) governs graceful pause.

### Stage 6 — Review and Iteration

GitHub PRs with Explainer-generated descriptions. Spec changes trigger Delta Detection (Section 18) for surgical re-execution. Foundry Evaluation benchmarks outputs against acceptance criteria.

---

## 12. Multi-Entry Architecture

Three entry points, all converging at Stage 2. Critical for enterprise adoption.

### 12.1 Conversational Design

User describes intent in chat. Designer agent elicits requirements. Best for: greenfield features, exploratory design, bug reports.

### 12.2 Document Upload

User uploads PRD, RFC, or ticket. Ingestion agent (o1) parses, extracts Output Spec, flags ambiguities. Foundry IQ indexes for RAG. Best for: PMs handing off requirements, enterprise teams with existing docs.

| Step | Service | Action |
|---|---|---|
| 1. Upload | Azure Blob Storage | Document stored; type detected |
| 2. Index | Foundry IQ | Indexed with >0.7 similarity threshold |
| 3. Parse | Foundry Agent (o1) | Structured extraction: deliverables, criteria, constraints |
| 4. Flag | Foundry Agent (GPT-4o) | Ambiguity detection: missing criteria, vague constraints |
| 5. Present | React UI | Pre-populated Output Spec with flagged items |

### 12.3 Codebase-Context

User connects repo. Foundry IQ indexes codebase. Constraint registry loads. Designer asks questions grounded in actual code structure. Best for: refactoring, bug fixes, feature additions.

---

## 13. Supported Workflows (7 Scenarios)

All workflows: **Chat → Spec → Approve → Agents Execute → PRs → Review.**

### Workflow 1: Greenfield Feature Build

**Entry:** Conversational Design. **Flow:** Describe feature → Designer elicits requirements → Output Spec → Planner derives DAG → Authorize → Builders implement (parallel, σ-routed) → Verifiers validate → Explainer generates PR descriptions → PRs for review.

> **Demo priority: #1** — Core identity. Shows full lifecycle.

### Workflow 2: PRD → Tasks → Swarm Build

**Entry:** Document Upload. **Flow:** Upload PRD → Ingestion agent parses → Output Spec (pre-populated) → User resolves flagged gaps → Planner derives tasks with PRD traceability → Authorize → Execute → PRs with requirement → task → code traceability.

> **Demo priority: Mention** — enterprise/PM appeal. Can be high-fidelity simulated if time-constrained.

### Workflow 3: Refactor Under Constraints

**Entry:** Codebase-Context. **Flow:** Connect repo → Load constraint registry → User: "Refactor auth module" → Spec with must_not constraints → Authorize → Builder refactors → Verifier confirms constraints hold → Explainer confirms compliance in PR.

> **Demo priority: Mention** — shows constraint enforcement.

### Workflow 4: Bug Fix with Root-Cause Explanation

**Entry:** Conversational + Codebase-Context. **Flow:** Describe bug → Load codebase → Spec focused on expected behavior → Builder reproduces, fixes, adds tests → Verifier validates → Explainer produces root cause analysis (explicit diffs, not proxy — per ACAR attribution finding).

> **Demo priority: #2** — Depth. Shows Explainer's ACAR-informed attribution.

### Workflow 5: Budget-Constrained Partial Execution

**Entry:** Any. **Flow:** Set low budget → Planner shows what fits → Authorize → Execute → At 80%: warning. At 95%: pause → Completed tasks → PRs. Partial tasks → draft PRs. User decides: top up / accept / abandon.

> **Demo priority: #3** — Credibility. Shows cost governance maturity.

### Workflow 6: Spec Change → Controlled Rebuild

**Entry:** Spec Editor (Stage 2 re-entry). **Flow:** Edit spec → Delta Detection (Section 17) computes semantic diff → Impact map: green (preserve) / amber (rebuild) / blue (new) / red (remove) → Re-authorize → Only impacted tasks execute → Explainer documents what changed.

> **Demo priority: #4** — Strongest close. Proves spec-driven, not spec-decorated.

### Workflow 7: CI/CD Failure Intelligence (Azure DevOps)

**Entry:** ADO Service Hook (automatic) or manual failure import. **Flow:** Pipeline fails → Failure captured via webhook → Normalized to failure schema → Failure Analyzer produces root cause + remediation plan → User reviews remediation → Authorize (new plan.lock with parentLockId) → Builder agents fix → Verifier re-runs ADO pipeline → Explainer documents root cause and resolution.

> **Demo priority: #3** — Enterprise differentiator. Shows ADO + Blueflame integration. Governed remediation with full audit trail.

---

# PART IV — DATA, GOVERNANCE & OBSERVABILITY

---

## 14. Artifact Model & Data Architecture

### 14.1 Artifact Hierarchy

| Artifact | Storage | Format | ACAR/TEAMLLM Parallel |
|---|---|---|---|
| Output Spec | Cosmos DB | YAML + Markdown | N/A (Blueflame-native) |
| PRD (derived) | Cosmos DB | Markdown | N/A |
| Task Plan + DAG | Cosmos DB | YAML + Markdown | N/A |
| Authorization Lock | Cosmos DB (immutable) | JSON (plan.lock.json) | TEAMLLM immutable artifacts |
| Constraint Registry | Cosmos DB | YAML | ACAR acceptance criteria |
| Run Archive | Azure Blob Storage | JSON + files | TEAMLLM runs.jsonl |
| Agent Traces | Azure Monitor | OpenTelemetry | TEAMLLM decision traces |
| Generated Code | GitHub | Source files | N/A |

### 14.2 Cosmos DB Data Model (8 Containers)

| Container | Partition Key | Purpose |
|---|---|---|
| specs | /projectId | Output specs with version history + SHA-256 hashes |
| plans | /runId | Task plans, PRDs, derived artifacts |
| locks | /runId | Immutable plan.lock.json (one per authorization) |
| runs | /projectId | State machine: PENDING → AUTHORIZED → EXECUTING → PAUSED → COMPLETED/FAILED/PARTIAL |
| agents | /runId | Agent status, token usage, σ values, cost tracking |
| constraints | /projectId | Project-level constraint registry (persistent across runs) |
| documents | /projectId | Uploaded document metadata; references to Blob Storage |
| failures | /runId | Normalized CI/CD failure records from Azure DevOps; TTL-enabled |

---

## 15. Constraint System (Project-Level Registry)

### 15.1 Why a Constraint Registry

Without persistent constraints, every new run starts with zero architectural knowledge. The registry stores rules that survive across runs, enabling Workflow 3 (Refactor Under Constraints). The Verifier uses these constraints as ground truth — addressing ACAR's agreement-but-wrong ceiling by evaluating against explicit criteria, not model consensus.

### 15.2 Constraint Schema

| Field | Type | Description |
|---|---|---|
| constraint_id | String | Unique ID (CONST-001) |
| scope | Enum | project \| module \| file |
| type | Enum | architectural \| behavioral \| performance \| security \| dependency |
| rule | String | Natural language statement |
| enforcement | Enum | hard (fail) \| soft (warn) |
| verification_method | String | Test suite, static analysis, AST check, or manual |
| source | String | user-defined \| extracted-from-codebase \| promoted-from-spec |

### 15.3 Constraint Lifecycle

Created by users (UI), extracted from codebase analysis (Foundry IQ), or promoted from spec-level constraints. Loaded automatically at run start. Frozen into plan.lock at authorization. Evaluated by Verifier against agent outputs. Editable by Blueflame:Admin role only.

---

## 16. Enforcement, Safety & Responsible AI

### 16.1 Allowed Agent Actions

| Action | Agent Roles | Enforcement |
|---|---|---|
| Create branches | Builder | GitHub App permissions + Entra Agent ID |
| Write code to branches | Builder | Branch-only; target branch protected |
| Trigger CI via GitHub Actions | Verifier | Actions trigger permission only; cannot modify workflows |
| Open pull requests | Builder | PR template enforced; linked to task ID + spec hash |
| Generate documentation | Explainer | Write to Cosmos DB + PR comments |
| Read codebase/specs/constraints | All agents | Foundry IQ + Cosmos DB read; project-scoped |

### 16.2 Prohibited Agent Actions

| Prohibited Action | Enforcement |
|---|---|
| Modifying specs | Cosmos DB RBAC: agents have no write to specs container |
| Changing constraints | Requires Blueflame:Admin; agents have Blueflame:Agent role |
| Merging code | GitHub branch protection: human approval required |
| Expanding scope | Foundry Control Plane: output validation against plan.lock task scope |
| Exceeding budgets | Foundry Control Plane: per-agent limits; Budget System pauses at threshold |
| Accessing other projects | Entra Agent ID project-scoped; Cosmos partition isolation |
| Modifying CI workflows | GitHub App excludes .github/ write access |

### 16.3 Responsible AI (Foundry Content Safety)

This section directly addresses the Best Enterprise Solution category's safety requirements.

| Safety Layer | Foundry Service | What It Catches |
|---|---|---|
| Input Filters | Foundry Content Safety | Prompt injection detection, jailbreak attempts, PII in user prompts |
| Output Filters (Text) | Foundry Content Safety | Harmful content, unsafe instructions in agent responses |
| Output Filters (Code) | Foundry Protected Material Detection | Agents generating unlicensed or copyrighted code snippets; code that mirrors protected source material |
| PII in Generated Code | Foundry Content Safety + Azure Policy | Agents accidentally embedding PII (API keys, emails, credentials) in generated code |
| Prompt Hygiene | Foundry Control Plane | Monitoring for prompt drift, injection, or unauthorized tool calls |
| Tool Call Authorization | Foundry Control Plane | Only registered MCP servers may be invoked; unauthorized tool calls blocked |

> **[ENTERPRISE]** Protected Material Detection for code is a critical enterprise feature. It prevents Builder agents from generating code that mirrors copyrighted source material — a real liability risk for enterprise adoption.

---

## 17. Budget System & Partial Execution

### 17.1 Budget Configuration

| Parameter | Set By | Scope |
|---|---|---|
| Total Run Ceiling | User (at authorization) | Maximum cost for entire run (USD) |
| Per-Agent Limit | Derived from σ-informed task estimates | Maximum cost per agent instance |
| Warning Threshold | Default 80% | Triggers UI warning |
| Pause Threshold | Default 95% | Triggers graceful execution pause |

### 17.2 State Machine

`AUTHORIZED → EXECUTING → (80%) WARNING → (95%) PAUSED → User: RESUME (top up) | ACCEPT (partial) | ABANDON`

### 17.3 Partial Result Handling

| Task State at Pause | Result | GitHub Artifact |
|---|---|---|
| Completed + Verified | Full result | PR opened (ready for review) |
| Completed, unverified | Code preserved | Draft PR with [UNVERIFIED] label |
| In-progress | Partial work | Draft PR with [PARTIAL] label |
| Not started | Deferred | No branch; marked DEFERRED |

---

## 18. Spec Delta Detection & Controlled Rebuild

### 18.1 Delta Detection Process

| Step | Action | Service |
|---|---|---|
| 1. Diff | Field-by-field YAML diff + semantic analysis of natural-language changes | Foundry Agent (GPT-4o) |
| 2. Classify | Each change: criterion added/removed/modified, constraint changed, deliverable changed, no-impact | Foundry Agent (GPT-4o) |
| 3. Impact Map | Map changes to affected tasks via acceptance_criteria_ids linkage | Planner Agent |
| 4. Decision | PRESERVE (unaffected) \| REBUILD (changed) \| NEW (added) \| REMOVE (deleted) | Planner Agent |
| 5. Present | Visual impact map: green/amber/blue/red. User confirms before re-authorization. | React UI |

### 18.2 Rebuild Execution

PRESERVE: branches untouched. REBUILD: branches deleted, re-created, agents re-execute. NEW: new branches. REMOVE: branches deleted, PRs closed with Explainer note. New plan.lock created. Re-authorization required.

---

## 19. Observability & Audit Trail

### 19.1 Recorded Data

| Data Point | Source | ACAR Parallel |
|---|---|---|
| Agent actions (every tool call, decision) | Foundry Tracing (OpenTelemetry) | TEAMLLM decision traces |
| Model usage (model, prompt, tokens, cost, σ) | Foundry Model Router | ACAR runs.jsonl |
| Cost breakdown (per-agent, per-task, per-run) | Foundry Control Plane + Azure Cost Mgmt | ACAR cost-accuracy Pareto |
| Constraint evaluations (pass/fail + evidence) | Verifier agent | ACAR acceptance criteria |
| Reasoning summaries + root cause analyses | Explainer agent | ACAR attribution (explicit, not proxy) |
| Spec versions + delta maps | Cosmos DB change feed | N/A (Blueflame-native) |
| Budget events (warnings, pauses, resumes) | Budget System | ACAR cost guards |

### 19.2 Real-Time Dashboard

React + SignalR: agent statuses, cost burn-down, DAG progress, constraint results, budget alerts. Primary interface for Stage 5.

### 19.3 Post-Run Report

Explainer generates: execution summary, per-task breakdown with spec traceability, constraint compliance report, cost analysis (actual vs. σ-estimated), and (for Workflow 4) root cause analysis. Stored in Cosmos DB, linked from GitHub PR.

---

# PART V — EXECUTION PLAN

---

## 20. Technology Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React/Next.js + Azure Static Web Apps | Chat, spec editor, dashboard, document upload |
| Real-time | Azure SignalR Service | Live agent streaming, budget alerts |
| Backend | Node.js/Python on Azure Container Apps | API gateway, webhooks, budget monitor |
| AI Platform | Microsoft Foundry (11 services) | Agent factory: models, routing, workflows, safety, tracing, evaluation, failure analysis |
| Models | GPT-4o, o1, GPT-4o-mini, Claude Sonnet 4.5 | σ-informed selection via Foundry Model Router |
| Agent Framework | Microsoft Agent Framework + A2A + MCP | Multi-agent orchestration |
| Database | Azure Cosmos DB (8 containers) | Specs, plans, locks, runs, agents, constraints, documents, failures |
| CI/CD Intelligence | Azure DevOps | Pipeline failure capture, test results, service hooks, remediation validation |
| Storage | Azure Blob Storage | Archives, uploaded documents |
| Code Execution | GitHub (Repos, Branches, PRs, Actions, Apps) | Agentic DevOps pipeline |
| Search/RAG | Azure AI Search (Foundry IQ) | ACAR-informed >0.7 threshold grounding |
| Identity | Azure Entra ID + Entra Agent ID | SSO, 4-tier RBAC, scoped agent identities |
| Safety | Foundry Content Safety + Protected Material Detection | PII, licensed code, prompt injection |
| Governance | Azure Policy + Foundry Control Plane | Rules, model allowlists, budget enforcement |
| Observability | Azure Monitor + Foundry Tracing | Full audit trail, cost tracking |

---

## 21. Implementation Roadmap (6-Week Sprint Plan)

Hackathon: February 10 – March 15, 2026. Prioritized for demo realism per review recommendations.

| Week | Sprint | Deliverables | Demo-Ready |
|---|---|---|---|
| **1** (Feb 10–16) | Foundation | Azure provisioning. GitHub App. Entra ID. React shell + SignalR. Monaco Editor. Foundry project + Designer agent deployed. | Chat + basic spec |
| **2** (Feb 17–23) | Core Loop | Stages 1–4 end-to-end (Conversational → Spec → Plan → Authorize). Cosmos DB model (8 containers). Spec versioning + freezing. plan.lock creation. Content Safety integration. | Workflow 1 (stages 1–4) |
| **3** (Feb 24–Mar 2) | Agent Swarm + DevOps | All 4 agents in Foundry. σ-informed Model Router. Foundry Workflows (sequential + parallel). GitHub branch/PR/Actions loop. A2A handoff. Constraint registry. **PRIORITY: Verifier → GitHub Actions → Swarm feedback loop (agentic DevOps demo).** | Workflow 1 full + Workflow 4 |
| **4** (Mar 3–9) | Governance + Delta | Budget system with pause/resume. Spec delta detection. Observability dashboard. Visual animations. Explainer root cause analysis. Protected Material Detection for code. | All 6 workflows |
| **5** (Mar 10–14) | Failure Intelligence | ADO adapter + normalized failure schema. Failure analyzer agent. Remediation authorization gate. Failure intelligence dashboard. | Workflow 7 (CI/CD Failure Intelligence) |
| **6** (Mar 14–15) | Demo + Polish | **PRIORITY: Record all 7 workflows. Workflow 1 + 6 + 7 fully functional. Workflow 4 + 5 functional. Workflow 2 high-fidelity simulated if needed.** Submission package. | Submission-ready |

> **[PRIORITY]** Risk mitigation: If Week 5 runs long, Workflow 7 (Failure Intelligence) can be a high-fidelity simulated demo. Workflows 1 and 6 must be 100% live. Workflow 7 is the enterprise differentiator — ADO integration strengthens Microsoft platform alignment.

---

## 22. Demo Strategy & Scenario

### 22.1 Recommended Demo Order (12–15 min)

| Order | Workflow | Duration | Purpose |
|---|---|---|---|
| 1 | Greenfield Build (WF1) | 4 min | Core identity. Full 6-stage lifecycle. |
| 2 | Bug Fix + Root Cause (WF4) | 2.5 min | Depth. Explainer's ACAR-informed attribution. |
| 3 | CI/CD Failure Intelligence (WF7) | 2.5 min | Enterprise. ADO failure → governed remediation. |
| 4 | Budget-Constrained (WF5) | 2 min | Credibility. Cost governance + partial execution. |
| 5 | Spec Change Rebuild (WF6) | 2.5 min | Strongest close. Delta detection. Proves spec-driven. |
| 6 | Mention WF2 + WF3 | 1 min | Document upload + constraint enforcement. |

### 22.2 Primary Demo: REST API Build (Workflow 1)

**Step 1 (45s):** User: "REST API for task management with CRUD, auth, RBAC." Designer asks about auth provider, database, deployment target.

**Step 2 (45s):** Output Spec: 12 criteria, 4 constraints (Entra ID auth, OpenAPI spec, 80%+ coverage, Container Apps deploy). User edits one criterion.

**Step 3 (30s):** Planner: 8 tasks, 4 parallelizable. σ estimates: 3 tasks at σ=0 (single-model), 5 at σ=0.5+ (multi-model). Est. cost: $2.40.

**Step 4 (15s):** User sets $5.00 ceiling. Authorizes. plan.lock created.

**Step 5 (60s):** Dashboard live. 4 Builders spawn. **KEY MOMENT:** Verifier triggers GitHub Action → tests run → results flow back → Verifier reports to swarm. Total cost: $1.87 (green).

**Step 6 (30s):** User reviews PRs in GitHub. Explainer descriptions show spec traceability. User merges.

### 22.3 Spec Change Demo (Workflow 6) — The Closer

After WF1, user adds criterion: "WebSocket notifications for task updates." Delta Detection: 6/8 tasks green (preserve), 1 amber (modify), 1 blue (new). Re-authorize. Only 2 tasks execute. Existing PRs preserved. Explainer: "Spec v2 adds WebSocket. Tasks 1–6 unaffected. Task 7 updated. Task 9 new."

> **[CLOSER]** This is the moment that wins. A spec change mid-stream, and the system surgically re-executes only what's affected. No other hackathon entry can do this.

### 22.4 Failure Intelligence Demo (Workflow 7) — The Enterprise Moment

After WF1, a CI pipeline fails in ADO. Blueflame captures the failure via service hook. Failure Analyzer: "Test `auth.middleware.test.ts` fails — missing `Authorization` header in request mock. Root cause: Builder generated handler expecting `Bearer` prefix but test sends raw token." Remediation plan: 1 task (fix test mock). User authorizes. Builder fixes. ADO pipeline re-runs. Green. Explainer: "Pipeline PIPE-47 failed due to auth header format mismatch. Remediation updated test to include Bearer prefix. 14 tests now pass."

> **[ENTERPRISE]** This is the moment that wins Best Enterprise Solution. A CI failure triggers governed AI remediation — no human debugging, full audit trail, same authorization gates.

---

## 23. Enterprise Upgrade Paths

### 23.1 Design Principle

Every Blueflame component is designed with a clear migration path from local-first MVP to enterprise-scale deployment. The MVP uses in-memory stores and single-server architectures for speed of development. Each component maps to an Azure service that provides multi-tenant, horizontally scalable equivalents.

> **[PRINCIPLE]** Every local operation has a clear server-side equivalent. No component is designed as a dead end.

### 23.2 Component Migration Table

| Component | MVP Implementation | Enterprise Upgrade | Azure Service |
|---|---|---|---|
| Run state | In-memory Map | Cosmos DB `runs` container | Azure Cosmos DB |
| Failure store | In-memory Map | Cosmos DB `failures` container with TTL + partition by org | Azure Cosmos DB |
| Budget tracking | Per-run ceiling | Org-level budget pools, team allocation, chargeback reporting | Azure Cost Management |
| Agent orchestration | Single-server DAG executor | Multi-instance with KEDA auto-scaling per org | Azure Container Apps |
| PlanLock storage | Cosmos single document | Cross-partition audit queries, compliance reporting | Azure Cosmos DB |
| Real-time streaming | Single Socket.IO hub | Room-per-org isolation, horizontal scaling | Azure Web PubSub |
| ADO adapter | Direct REST API calls | Azure Service Bus queue for webhook ingestion at scale | Azure Service Bus |
| Failure analyzer | Per-run Foundry call | Shared Foundry deployment with priority queues per tenant | Microsoft Foundry |
| Remediation plans | Per-run in-memory | Cosmos `remediations` container, linked via parentLockId | Azure Cosmos DB |
| Constraint enforcement | In-process checks | Azure Policy-backed constraint store with org-level inheritance | Azure Policy |
| Authentication | Single-tenant Entra ID | Multi-tenant Entra ID with B2B collaboration | Azure Entra ID |
| Observability | Azure Monitor (single workspace) | Per-org workspaces with cross-org aggregation | Azure Monitor |

### 23.3 Multi-Tenant Architecture (Future)

```
                    ┌──────────────────────────┐
                    │   Azure Front Door       │
                    │   (Global Load Balancer)  │
                    └─────────┬────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
     ┌────────▼──┐    ┌──────▼───┐    ┌──────▼───┐
     │  Org A    │    │  Org B   │    │  Org C   │
     │  (tenant) │    │  (tenant)│    │  (tenant)│
     └────────┬──┘    └──────┬───┘    └──────┬───┘
              │               │               │
     ┌────────▼───────────────▼───────────────▼──┐
     │        Azure Cosmos DB (partitioned)      │
     │   /orgId partition key across containers  │
     └───────────────────────────────────────────┘
```

### 23.4 Scalability Considerations

| Concern | MVP Approach | Enterprise Approach |
|---|---|---|
| Concurrent runs | Sequential per server | KEDA scales Container Apps instances per org load |
| Cost tracking frequency | Per-task updates | Event-driven via Cosmos change feed + Azure Functions |
| Artifact storage | Cosmos DB (small docs) | Azure Blob for large outputs, Cosmos for metadata |
| Pipeline log volume | Direct API fetch | Azure Service Bus buffering + background processing |
| Agent concurrency | In-process parallel | Container Apps with dedicated agent pools per org |
| Audit retention | Cosmos TTL (30 days) | Azure Blob archival with configurable retention policies |

---

## 24. Judging Criteria Alignment (Final)

| Criterion | Evidence | Differentiator |
|---|---|---|
| Innovation | Spec-first SDLC + authorization gates + σ-routing + constraint registry + delta rebuild + budget-governed partial execution + CI/CD failure intelligence | Research-backed: ACAR paper with 7,550+ auditable runs. Documented negative results demonstrate intellectual rigor. Failure intelligence closes the CI/CD feedback loop with governed remediation. |
| Impact | Enterprise trust deficit solved. 7 real-world workflows. Cost governance. Full audit trail. CI/CD failure remediation. | Not a toy: persistent constraints, budget system with graceful degradation, agentic DevOps loop with real GitHub Actions + Azure DevOps integration. Enterprise upgrade paths documented. |
| Technical Usability | 3 entry points. 6-stage UX. GitHub PRs. Real-time dashboard. Partial execution. ADO pipeline integration. | Zero adoption friction: developers use tools they already know (GitHub, ADO, PRs). No new review tool to learn. |
| Platform Alignment | 11 Foundry services. 13 Azure services. Full GitHub + Azure DevOps integration. Model-agnostic σ-routing. | Deepest Foundry + Azure integration in the hackathon: Content Safety, Protected Material Detection, Model Router, Control Plane, Workflows, IQ, Tracing, Evaluation, Agent Service, ADO Pipelines. |

---

*— End of Specification —*

**Blueflame: Refine, don't generate.**

*Grounded in ACAR. Built on Microsoft Foundry. Designed to win.*
