import { RemediationStatus } from "@blueflame/shared";
import type { RootCauseAnalysis } from "@blueflame/shared";
import { beforeEach, describe, expect, it } from "vitest";
import {
	attachRootCause,
	authorizeRemediation,
	clearAllRemediations,
	completeRemediation,
	createRemediation,
	failRemediation,
	getRemediationSync,
	getRemediationsByFailureId,
	getRemediationsByRunId,
	startAnalysis,
	startRemediationExecution,
} from "./remediation.js";

const mockRootCause: RootCauseAnalysis = {
	summary: "Test failure in auth module",
	rootCause: "Missing null check on session token",
	confidence: 0.85,
	affectedFiles: ["src/auth.ts"],
	remediationTasks: [
		{
			id: "REM-001",
			description: "Add null check",
			estimatedSigma: 2,
			estimatedCost: 0.1,
			agentRole: "BUILDER",
		},
	],
};

describe("remediation service", () => {
	beforeEach(() => {
		clearAllRemediations();
	});

	it("should create a remediation in PENDING state", () => {
		const rem = createRemediation({
			failureId: "FAIL-1",
			runId: "run-1",
			projectId: "proj-1",
			parentLockId: "lock-1",
		});

		expect(rem.status).toBe(RemediationStatus.Pending);
		expect(rem.failureId).toBe("FAIL-1");
		expect(rem.parentLockId).toBe("lock-1");
		expect(rem.rootCause).toBeNull();
		expect(rem.remediationLockId).toBeNull();
	});

	it("should transition PENDING → ANALYZING", () => {
		const rem = createRemediation({
			failureId: "FAIL-1",
			runId: "run-1",
			projectId: "proj-1",
			parentLockId: "lock-1",
		});

		const result = startAnalysis(rem.remediationId);
		expect(result?.status).toBe(RemediationStatus.Analyzing);
	});

	it("should transition ANALYZING → PLAN_READY with root cause", () => {
		const rem = createRemediation({
			failureId: "FAIL-1",
			runId: "run-1",
			projectId: "proj-1",
			parentLockId: "lock-1",
		});
		startAnalysis(rem.remediationId);

		const result = attachRootCause(rem.remediationId, mockRootCause);
		expect(result?.status).toBe(RemediationStatus.PlanReady);
		expect(result?.rootCause?.summary).toBe("Test failure in auth module");
		expect(result?.rootCause?.remediationTasks).toHaveLength(1);
	});

	it("should transition PLAN_READY → AUTHORIZED with lock ID", () => {
		const rem = createRemediation({
			failureId: "FAIL-1",
			runId: "run-1",
			projectId: "proj-1",
			parentLockId: "lock-1",
		});
		startAnalysis(rem.remediationId);
		attachRootCause(rem.remediationId, mockRootCause);

		const result = authorizeRemediation(rem.remediationId, "lock-remediation-1");
		expect(result?.status).toBe(RemediationStatus.Authorized);
		expect(result?.remediationLockId).toBe("lock-remediation-1");
	});

	it("should transition AUTHORIZED → EXECUTING → COMPLETED", () => {
		const rem = createRemediation({
			failureId: "FAIL-1",
			runId: "run-1",
			projectId: "proj-1",
			parentLockId: "lock-1",
		});
		startAnalysis(rem.remediationId);
		attachRootCause(rem.remediationId, mockRootCause);
		authorizeRemediation(rem.remediationId, "lock-rem-1");

		const executing = startRemediationExecution(rem.remediationId);
		expect(executing?.status).toBe(RemediationStatus.Executing);

		const completed = completeRemediation(rem.remediationId);
		expect(completed?.status).toBe(RemediationStatus.Completed);
	});

	it("should allow failing from any state", () => {
		const rem = createRemediation({
			failureId: "FAIL-1",
			runId: "run-1",
			projectId: "proj-1",
			parentLockId: "lock-1",
		});
		startAnalysis(rem.remediationId);

		const result = failRemediation(rem.remediationId);
		expect(result?.status).toBe(RemediationStatus.Failed);
	});

	it("should reject invalid state transitions", () => {
		const rem = createRemediation({
			failureId: "FAIL-1",
			runId: "run-1",
			projectId: "proj-1",
			parentLockId: "lock-1",
		});

		// Can't attach root cause from PENDING (must be ANALYZING)
		expect(attachRootCause(rem.remediationId, mockRootCause)).toBeNull();
		// Can't authorize from PENDING
		expect(authorizeRemediation(rem.remediationId, "lock-1")).toBeNull();
		// Can't execute from PENDING
		expect(startRemediationExecution(rem.remediationId)).toBeNull();
		// Can't complete from PENDING
		expect(completeRemediation(rem.remediationId)).toBeNull();
	});

	it("should retrieve by ID", () => {
		const rem = createRemediation({
			failureId: "FAIL-1",
			runId: "run-1",
			projectId: "proj-1",
			parentLockId: "lock-1",
		});

		expect(getRemediationSync(rem.remediationId)).toBeDefined();
		expect(getRemediationSync("nonexistent")).toBeUndefined();
	});

	it("should query by failureId", () => {
		createRemediation({
			failureId: "FAIL-A",
			runId: "run-1",
			projectId: "proj-1",
			parentLockId: "lock-1",
		});
		createRemediation({
			failureId: "FAIL-A",
			runId: "run-1",
			projectId: "proj-1",
			parentLockId: "lock-1",
		});
		createRemediation({
			failureId: "FAIL-B",
			runId: "run-2",
			projectId: "proj-1",
			parentLockId: "lock-2",
		});

		expect(getRemediationsByFailureId("FAIL-A")).toHaveLength(2);
		expect(getRemediationsByFailureId("FAIL-B")).toHaveLength(1);
	});

	it("should query by runId", () => {
		createRemediation({
			failureId: "FAIL-1",
			runId: "run-X",
			projectId: "proj-1",
			parentLockId: "lock-1",
		});
		createRemediation({
			failureId: "FAIL-2",
			runId: "run-X",
			projectId: "proj-1",
			parentLockId: "lock-1",
		});

		expect(getRemediationsByRunId("run-X")).toHaveLength(2);
		expect(getRemediationsByRunId("run-Y")).toHaveLength(0);
	});
});
