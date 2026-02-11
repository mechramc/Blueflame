import type { Container } from "@azure/cosmos";
import type { PlanLock } from "@blueflame/shared";
import { describe, expect, it, vi } from "vitest";
import { LocksRepository } from "./locks.js";

function mockLock(overrides?: Partial<PlanLock>): PlanLock {
	return {
		id: "lock-1",
		lockId: "lock-1",
		runId: "run-1",
		projectId: "proj-1",
		specHash: "abc123",
		approvedTaskIds: ["TASK-001"],
		budgetCeiling: 50,
		agentPermissions: [],
		constraintSnapshot: [],
		authorizedBy: "user-1",
		authorizedAt: "2026-01-01T00:00:00Z",
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

describe("LocksRepository", () => {
	it("should create a lock", async () => {
		const lock = mockLock();
		const container = createMockContainer();
		vi.mocked(container.items.create).mockResolvedValue({
			resource: lock,
			statusCode: 201,
		} as never);

		const repo = new LocksRepository(container);
		const result = await repo.create(lock, "run-1");

		expect(result.ok).toBe(true);
	});

	it("should read a lock by ID", async () => {
		const lock = mockLock();
		const mockItem = { read: vi.fn().mockResolvedValue({ resource: lock }) };
		const container = createMockContainer();
		vi.mocked(container.item).mockReturnValue(mockItem as never);

		const repo = new LocksRepository(container);
		const result = await repo.read("lock-1", "run-1");

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.lockId).toBe("lock-1");
		}
	});

	it("should NOT expose update method", () => {
		const container = createMockContainer();
		const repo = new LocksRepository(container);
		expect("update" in repo).toBe(false);
	});

	it("should NOT expose delete method", () => {
		const container = createMockContainer();
		const repo = new LocksRepository(container);
		expect("delete" in repo).toBe(false);
	});

	it("should find lock by run ID", async () => {
		const lock = mockLock();
		const mockIterator = {
			hasMoreResults: vi.fn().mockReturnValueOnce(true).mockReturnValue(false),
			fetchNext: vi.fn().mockResolvedValue({ resources: [lock] }),
		};
		const container = createMockContainer();
		vi.mocked(container.items.query).mockReturnValue(mockIterator as never);

		const repo = new LocksRepository(container);
		const result = await repo.findByRun("run-1");

		expect(result).toBeDefined();
		expect(result?.lockId).toBe("lock-1");
	});
});
