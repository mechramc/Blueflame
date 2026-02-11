import type { Container } from "@azure/cosmos";
import { type Run, RunStatus } from "@blueflame/shared";
import { describe, expect, it, vi } from "vitest";
import { RunsRepository } from "./runs.js";

function mockRun(overrides?: Partial<Run>): Run {
	return {
		id: "run-1",
		runId: "run-1",
		projectId: "proj-1",
		status: RunStatus.Pending,
		lockId: null,
		specId: "spec-1",
		costActual: 0,
		costBudget: 100,
		startedAt: null,
		endedAt: null,
		createdAt: "2026-01-01T00:00:00Z",
		createdBy: "user-1",
		...overrides,
	};
}

function createMockContainer(): Container {
	return {
		items: {
			create: vi.fn(),
			query: vi.fn(),
		},
		item: vi.fn(),
	} as unknown as Container;
}

describe("RunsRepository", () => {
	describe("transition", () => {
		it("should allow valid transition PENDING → AUTHORIZED", async () => {
			const run = mockRun({ status: RunStatus.Pending });
			const container = createMockContainer();
			const mockItem = {
				read: vi.fn().mockResolvedValue({ resource: run }),
				replace: vi.fn().mockResolvedValue({
					resource: { ...run, status: RunStatus.Authorized },
				}),
			};
			vi.mocked(container.item).mockReturnValue(mockItem as never);

			const repo = new RunsRepository(container);
			const result = await repo.transition("run-1", "proj-1", RunStatus.Authorized);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.status).toBe(RunStatus.Authorized);
			}
		});

		it("should allow valid transition EXECUTING → COMPLETED and set endedAt", async () => {
			const run = mockRun({
				status: RunStatus.Executing,
				startedAt: "2026-01-01T00:00:00Z",
			});
			const container = createMockContainer();
			const mockItem = {
				read: vi.fn().mockResolvedValue({ resource: run }),
				replace: vi.fn().mockImplementation((doc) => Promise.resolve({ resource: doc })),
			};
			vi.mocked(container.item).mockReturnValue(mockItem as never);

			const repo = new RunsRepository(container);
			const result = await repo.transition("run-1", "proj-1", RunStatus.Completed);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.status).toBe(RunStatus.Completed);
				expect(result.value.endedAt).toBeDefined();
			}
		});

		it("should reject invalid transition PENDING → EXECUTING", async () => {
			const run = mockRun({ status: RunStatus.Pending });
			const container = createMockContainer();
			const mockItem = {
				read: vi.fn().mockResolvedValue({ resource: run }),
			};
			vi.mocked(container.item).mockReturnValue(mockItem as never);

			const repo = new RunsRepository(container);
			const result = await repo.transition("run-1", "proj-1", RunStatus.Executing);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.message).toContain("Invalid transition");
				expect(result.error.message).toContain("PENDING");
			}
		});

		it("should reject transition from terminal state COMPLETED", async () => {
			const run = mockRun({ status: RunStatus.Completed });
			const container = createMockContainer();
			const mockItem = {
				read: vi.fn().mockResolvedValue({ resource: run }),
			};
			vi.mocked(container.item).mockReturnValue(mockItem as never);

			const repo = new RunsRepository(container);
			const result = await repo.transition("run-1", "proj-1", RunStatus.Executing);

			expect(result.ok).toBe(false);
		});

		it("should set startedAt on first EXECUTING transition", async () => {
			const run = mockRun({
				status: RunStatus.Authorized,
				startedAt: null,
			});
			const container = createMockContainer();
			const mockItem = {
				read: vi.fn().mockResolvedValue({ resource: run }),
				replace: vi.fn().mockImplementation((doc) => Promise.resolve({ resource: doc })),
			};
			vi.mocked(container.item).mockReturnValue(mockItem as never);

			const repo = new RunsRepository(container);
			const result = await repo.transition("run-1", "proj-1", RunStatus.Executing);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.startedAt).toBeDefined();
			}
		});
	});
});
