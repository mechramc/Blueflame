import { createHash } from "node:crypto";
import type { Container } from "@azure/cosmos";
import { type OutputSpec, SpecStatus } from "@blueflame/shared";
import { describe, expect, it, vi } from "vitest";
import { SpecsRepository } from "./specs.js";

function mockSpec(overrides?: Partial<OutputSpec>): OutputSpec {
	return {
		id: "spec-1",
		projectId: "proj-1",
		specId: "spec-1",
		version: 1,
		status: SpecStatus.Draft,
		specHash: null,
		title: "Test Spec",
		description: "A test spec",
		deliverables: [],
		acceptanceCriteria: [],
		constraints: { must: [], mustNot: [] },
		nonGoals: [],
		risks: [],
		definitionOfDone: "All tests pass",
		inheritedConstraints: [],
		content: "title: Test Spec\ndescription: A test spec",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
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

describe("SpecsRepository", () => {
	describe("freeze", () => {
		it("should freeze a draft spec with SHA-256 hash", async () => {
			const spec = mockSpec();
			const expectedHash = createHash("sha256").update(spec.content).digest("hex");

			const container = createMockContainer();
			const mockItem = {
				read: vi.fn().mockResolvedValue({ resource: spec }),
				replace: vi.fn().mockImplementation((doc) => Promise.resolve({ resource: doc })),
			};
			vi.mocked(container.item).mockReturnValue(mockItem as never);

			const repo = new SpecsRepository(container);
			const result = await repo.freeze("spec-1", "proj-1");

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.status).toBe(SpecStatus.Frozen);
				expect(result.value.specHash).toBe(expectedHash);
				expect(result.value.version).toBe(2);
			}
		});

		it("should reject freezing an already frozen spec", async () => {
			const spec = mockSpec({ status: SpecStatus.Frozen });
			const container = createMockContainer();
			const mockItem = {
				read: vi.fn().mockResolvedValue({ resource: spec }),
			};
			vi.mocked(container.item).mockReturnValue(mockItem as never);

			const repo = new SpecsRepository(container);
			const result = await repo.freeze("spec-1", "proj-1");

			expect(result.ok).toBe(false);
		});

		it("should produce deterministic hashes for same content", async () => {
			const content = "title: Deterministic\ndescription: Same content";
			const spec = mockSpec({ content });

			const container = createMockContainer();
			const mockItem = {
				read: vi.fn().mockResolvedValue({ resource: spec }),
				replace: vi.fn().mockImplementation((doc) => Promise.resolve({ resource: doc })),
			};
			vi.mocked(container.item).mockReturnValue(mockItem as never);

			const repo = new SpecsRepository(container);

			const result1 = await repo.freeze("spec-1", "proj-1");
			// Reset mock for second call
			mockItem.read.mockResolvedValue({ resource: { ...spec, status: SpecStatus.Draft } });
			const result2 = await repo.freeze("spec-1", "proj-1");

			expect(result1.ok && result2.ok).toBe(true);
			if (result1.ok && result2.ok) {
				expect(result1.value.specHash).toBe(result2.value.specHash);
			}
		});
	});
});
