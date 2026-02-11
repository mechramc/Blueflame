/**
 * Demo seed route — populates in-memory stores with realistic demo data.
 *
 * POST /api/demo/seed — populates all stores
 * POST /api/demo/reset — clears all stores
 *
 * For hackathon demo only. Not for production.
 */

import { FailureSource, FailureType } from "@blueflame/shared";
import type { NormalizedFailure } from "@blueflame/shared";
import { Router } from "express";
import { addMessage, clearConversation } from "../services/conversation.js";
import { clearAllFailures, storeFailure } from "../services/failure-store.js";
import {
	attachRootCause,
	clearAllRemediations,
	createRemediation,
	startAnalysis,
} from "../services/remediation.js";
import { clearAllSpecs, createSpecFromYaml } from "../services/spec-generation.js";

export const demoSeedRouter = Router();

const PROJECT_ID = "demo-project-1";
const RUN_ID = "demo-run-1";

/**
 * POST /api/demo/seed
 * Populates all in-memory stores with demo data.
 */
demoSeedRouter.post("/seed", (_req, res) => {
	// 1. Seed conversation history
	seedConversation();

	// 2. Seed spec
	seedSpec();

	// 3. Seed failures
	seedFailures();

	// 4. Seed remediations (with root cause analysis)
	seedRemediations();

	res.json({
		seeded: true,
		data: {
			conversations: 4,
			specs: 1,
			failures: 3,
			remediations: 2,
		},
	});
});

/**
 * POST /api/demo/reset
 * Clears all in-memory stores.
 */
demoSeedRouter.post("/reset", (_req, res) => {
	clearConversation(PROJECT_ID);
	clearAllSpecs();
	clearAllFailures();
	clearAllRemediations();
	res.json({ reset: true });
});

function seedConversation() {
	clearConversation(PROJECT_ID);

	addMessage(PROJECT_ID, {
		id: "msg-seed-1",
		projectId: PROJECT_ID,
		role: "user",
		content:
			"I want to build a full-stack task management app with real-time updates, role-based access control, and a Kanban board view.",
		createdAt: "2026-02-11T08:00:00Z",
	});

	addMessage(PROJECT_ID, {
		id: "msg-seed-2",
		projectId: PROJECT_ID,
		role: "agent",
		content:
			"Great choice! I'll help you design a **Task Management Platform** with these key features:\n\n1. **Real-time Kanban Board** — drag-and-drop cards with WebSocket updates\n2. **Role-Based Access** — Admin, Manager, and Member tiers\n3. **Task Lifecycle** — Create → Assign → In Progress → Review → Done\n4. **Notifications** — real-time alerts for assignments and status changes\n\nShall I generate a detailed specification with acceptance criteria?",
		createdAt: "2026-02-11T08:00:05Z",
	});

	addMessage(PROJECT_ID, {
		id: "msg-seed-3",
		projectId: PROJECT_ID,
		role: "user",
		content:
			"Yes, please generate the spec. Make sure it includes API endpoints, database schema, and deployment to Azure.",
		createdAt: "2026-02-11T08:01:00Z",
	});

	addMessage(PROJECT_ID, {
		id: "msg-seed-4",
		projectId: PROJECT_ID,
		role: "agent",
		content:
			"I've generated a comprehensive specification. You can see it in the **Specification** panel on the right. It includes:\n\n- 8 deliverables covering frontend, backend, database, auth, real-time, and deployment\n- 12 acceptance criteria with testable conditions\n- Architecture constraints (React + Node.js + Cosmos DB + Azure)\n- Risk assessment for WebSocket scaling and auth complexity\n\nReview it and click **Accept** when you're satisfied, then **Freeze** to lock it for planning.",
		createdAt: "2026-02-11T08:01:10Z",
	});
}

function seedSpec() {
	clearAllSpecs();

	const yamlContent = `title: "TaskFlow — Real-time Task Management Platform"
description: |
  A full-stack task management application with real-time Kanban board,
  role-based access control, and Azure deployment. Built with React,
  Node.js, Cosmos DB, and Azure Container Apps.

deliverables:
  - id: D-001
    title: "Kanban Board UI"
    description: "Drag-and-drop task board with columns for each status"
  - id: D-002
    title: "Task CRUD API"
    description: "RESTful endpoints for task create, read, update, delete"
  - id: D-003
    title: "Real-time Updates"
    description: "WebSocket-based live updates when tasks change"
  - id: D-004
    title: "Role-Based Access Control"
    description: "Admin, Manager, Member roles with scoped permissions"
  - id: D-005
    title: "User Authentication"
    description: "Microsoft Entra ID SSO with JWT tokens"
  - id: D-006
    title: "Database Schema"
    description: "Cosmos DB containers for tasks, users, and audit log"
  - id: D-007
    title: "Notification System"
    description: "In-app notifications for task assignments and updates"
  - id: D-008
    title: "Azure Deployment"
    description: "Container Apps + Static Web Apps + Cosmos DB via Bicep"

acceptance_criteria:
  - id: AC-001
    description: "User can create a task with title, description, and assignee"
  - id: AC-002
    description: "User can drag task between Kanban columns"
  - id: AC-003
    description: "Changes propagate to all connected clients within 500ms"
  - id: AC-004
    description: "Admin can manage users and roles"
  - id: AC-005
    description: "Non-authenticated users are redirected to login"
  - id: AC-006
    description: "API returns 403 for unauthorized role access"

constraints:
  must:
    - "Use TypeScript strict mode throughout"
    - "All API inputs validated with Zod"
    - "Minimum 80% test coverage"
  must_not:
    - "No direct database access from frontend"
    - "No secrets in source code"

non_goals:
  - "Mobile native app (web-responsive is sufficient)"
  - "Offline mode"

risks:
  - id: R-001
    description: "WebSocket scaling under 1000+ concurrent users"
    mitigation: "Use Azure Web PubSub for managed WebSocket scaling"
  - id: R-002
    description: "Cosmos DB partition key design for multi-tenant"
    mitigation: "Partition by projectId, use composite index for queries"

definition_of_done: "All acceptance criteria pass, CI green, deployed to Azure staging"
`;

	createSpecFromYaml(PROJECT_ID, yamlContent, "system");
}

function seedFailures() {
	clearAllFailures();

	const failures: NormalizedFailure[] = [
		{
			id: "FAIL-42-1",
			failureId: "FAIL-42-1",
			runId: RUN_ID,
			projectId: PROJECT_ID,
			source: FailureSource.AzureDevOps,
			pipelineId: "pipeline-main",
			buildNumber: "42",
			failureType: FailureType.Test,
			failedSteps: [
				{
					name: "npm test",
					exitCode: 1,
					logExcerpt:
						"FAIL src/auth/login.test.ts\n  ● Login handler › should return 401 for invalid token\n    Expected: 401\n    Received: 500\n\n    TypeError: Cannot read properties of null (reading 'verify')\n      at verifyToken (src/auth/token.ts:23:15)\n      at loginHandler (src/auth/login.ts:45:12)",
					durationSeconds: 45,
				},
			],
			testResults: {
				total: 156,
				passed: 154,
				failed: 2,
				skipped: 0,
				details: [
					{
						testName: "Login handler › should return 401 for invalid token",
						errorMessage: "TypeError: Cannot read properties of null",
						durationMs: 120,
					},
					{
						testName: "Login handler › should handle expired tokens",
						errorMessage: "Expected 401, Received 500",
						durationMs: 85,
					},
				],
			},
			environment: { os: "ubuntu-latest", runtimeVersion: "node-20.11.0" },
			branchRef: "refs/heads/blueflame/run-demo-run-1",
			commitSha: "a1b2c3d4e5f6",
			timestamp: "2026-02-11T10:30:00Z",
			rawLogUrl: "https://dev.azure.com/blueflame/taskflow/_build/results?buildId=42",
			ttl: 2592000,
		},
		{
			id: "FAIL-43-1",
			failureId: "FAIL-43-1",
			runId: RUN_ID,
			projectId: PROJECT_ID,
			source: FailureSource.AzureDevOps,
			pipelineId: "pipeline-main",
			buildNumber: "43",
			failureType: FailureType.Build,
			failedSteps: [
				{
					name: "tsc --build",
					exitCode: 2,
					logExcerpt:
						"src/api/routes/tasks.ts(67,5): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.\n  Type 'undefined' is not assignable to type 'string'.",
					durationSeconds: 12,
				},
			],
			testResults: null,
			environment: { os: "ubuntu-latest", runtimeVersion: "node-20.11.0" },
			branchRef: "refs/heads/blueflame/run-demo-run-1",
			commitSha: "b2c3d4e5f6a7",
			timestamp: "2026-02-11T11:15:00Z",
			rawLogUrl: "https://dev.azure.com/blueflame/taskflow/_build/results?buildId=43",
			ttl: 2592000,
		},
		{
			id: "FAIL-44-1",
			failureId: "FAIL-44-1",
			runId: RUN_ID,
			projectId: PROJECT_ID,
			source: FailureSource.AzureDevOps,
			pipelineId: "pipeline-deploy",
			buildNumber: "44",
			failureType: FailureType.Deploy,
			failedSteps: [
				{
					name: "az containerapp update",
					exitCode: 1,
					logExcerpt:
						"ERROR: (ResourceNotFound) The Resource 'Microsoft.App/containerApps/taskflow-api' under resource group 'rg-blueflame-prod' was not found.",
					durationSeconds: 8,
				},
			],
			testResults: null,
			environment: { os: "ubuntu-latest", runtimeVersion: "azure-cli-2.56.0" },
			branchRef: "refs/heads/main",
			commitSha: "c3d4e5f6a7b8",
			timestamp: "2026-02-11T12:00:00Z",
			rawLogUrl: "https://dev.azure.com/blueflame/taskflow/_build/results?buildId=44",
			ttl: 2592000,
		},
	];

	for (const f of failures) {
		storeFailure(f);
	}
}

function seedRemediations() {
	clearAllRemediations();

	// Remediation for FAIL-42 (test failure) — fully analyzed with root cause
	const rem1 = createRemediation({
		failureId: "FAIL-42-1",
		runId: RUN_ID,
		projectId: PROJECT_ID,
		parentLockId: "lock-demo-run-1-original",
	});
	startAnalysis(rem1.remediationId);
	attachRootCause(rem1.remediationId, {
		summary: "Null reference in token verification — missing null check on JWT secret",
		rootCause:
			"The `verifyToken()` function at `src/auth/token.ts:23` calls `jwt.verify()` without checking if `process.env.JWT_SECRET` is defined. When the secret is undefined (missing from CI environment), `jwt.verify(token, null)` throws a TypeError instead of returning an authentication error. This causes the login handler to return 500 instead of 401.",
		confidence: 0.92,
		affectedFiles: ["src/auth/token.ts", "src/auth/login.ts", "src/auth/login.test.ts"],
		remediationTasks: [
			{
				id: "REM-001",
				description:
					"Add null check for JWT_SECRET in verifyToken() — throw AuthenticationError if missing",
				estimatedSigma: 1,
				estimatedCost: 0.05,
				agentRole: "BUILDER",
			},
			{
				id: "REM-002",
				description: "Add JWT_SECRET to CI pipeline environment variables in azure-pipelines.yml",
				estimatedSigma: 1,
				estimatedCost: 0.03,
				agentRole: "BUILDER",
			},
			{
				id: "REM-003",
				description: "Add test case for missing JWT_SECRET scenario in login.test.ts",
				estimatedSigma: 1,
				estimatedCost: 0.05,
				agentRole: "BUILDER",
			},
		],
	});

	// Remediation for FAIL-43 (build failure) — in ANALYZING state
	const rem2 = createRemediation({
		failureId: "FAIL-43-1",
		runId: RUN_ID,
		projectId: PROJECT_ID,
		parentLockId: "lock-demo-run-1-original",
	});
	startAnalysis(rem2.remediationId);
}
