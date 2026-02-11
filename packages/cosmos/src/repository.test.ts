import type { Container } from "@azure/cosmos";
import { describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "./errors.js";
import { type CosmosDocument, Repository } from "./repository.js";

interface TestDoc extends CosmosDocument {
	id: string;
	projectId: string;
	name: string;
}

function createMockContainer(overrides?: Partial<Container>): Container {
	return {
		items: {
			create: vi.fn(),
			query: vi.fn(),
		},
		item: vi.fn(),
		...overrides,
	} as unknown as Container;
}

describe("Repository", () => {
	describe("create", () => {
		it("should create a document and return it", async () => {
			const doc: TestDoc = { id: "1", projectId: "p1", name: "test" };
			const container = createMockContainer();
			vi.mocked(container.items.create).mockResolvedValue({
				resource: doc,
				statusCode: 201,
			} as never);

			const repo = new Repository<TestDoc>(container, "test");
			const result = await repo.create(doc, "p1");

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.name).toBe("test");
			}
		});

		it("should return error on conflict (409)", async () => {
			const doc: TestDoc = { id: "1", projectId: "p1", name: "test" };
			const container = createMockContainer();
			vi.mocked(container.items.create).mockRejectedValue({ code: 409 });

			const repo = new Repository<TestDoc>(container, "test");
			const result = await repo.create(doc, "p1");

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toBeInstanceOf(ConflictError);
			}
		});
	});

	describe("read", () => {
		it("should read a document by id and partition key", async () => {
			const doc: TestDoc = { id: "1", projectId: "p1", name: "test" };
			const mockItem = { read: vi.fn().mockResolvedValue({ resource: doc }) };
			const container = createMockContainer();
			vi.mocked(container.item).mockReturnValue(mockItem as never);

			const repo = new Repository<TestDoc>(container, "test");
			const result = await repo.read("1", "p1");

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.name).toBe("test");
			}
		});

		it("should return NotFoundError when resource is null", async () => {
			const mockItem = {
				read: vi.fn().mockResolvedValue({ resource: null }),
			};
			const container = createMockContainer();
			vi.mocked(container.item).mockReturnValue(mockItem as never);

			const repo = new Repository<TestDoc>(container, "test");
			const result = await repo.read("missing", "p1");

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});

		it("should return NotFoundError on 404", async () => {
			const mockItem = {
				read: vi.fn().mockRejectedValue({ code: 404 }),
			};
			const container = createMockContainer();
			vi.mocked(container.item).mockReturnValue(mockItem as never);

			const repo = new Repository<TestDoc>(container, "test");
			const result = await repo.read("missing", "p1");

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});
	});

	describe("update", () => {
		it("should replace a document", async () => {
			const doc: TestDoc = {
				id: "1",
				projectId: "p1",
				name: "updated",
				_etag: '"etag-1"',
			};
			const mockItem = {
				replace: vi.fn().mockResolvedValue({ resource: doc }),
			};
			const container = createMockContainer();
			vi.mocked(container.item).mockReturnValue(mockItem as never);

			const repo = new Repository<TestDoc>(container, "test");
			const result = await repo.update(doc, "p1");

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.name).toBe("updated");
			}
			expect(mockItem.replace).toHaveBeenCalledWith(doc, {
				accessCondition: { type: "IfMatch", condition: '"etag-1"' },
			});
		});
	});

	describe("delete", () => {
		it("should delete a document", async () => {
			const mockItem = {
				delete: vi.fn().mockResolvedValue({}),
			};
			const container = createMockContainer();
			vi.mocked(container.item).mockReturnValue(mockItem as never);

			const repo = new Repository<TestDoc>(container, "test");
			const result = await repo.delete("1", "p1");

			expect(result.ok).toBe(true);
		});

		it("should return NotFoundError on 404", async () => {
			const mockItem = {
				delete: vi.fn().mockRejectedValue({ code: 404 }),
			};
			const container = createMockContainer();
			vi.mocked(container.item).mockReturnValue(mockItem as never);

			const repo = new Repository<TestDoc>(container, "test");
			const result = await repo.delete("missing", "p1");

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toBeInstanceOf(NotFoundError);
			}
		});
	});

	describe("query", () => {
		it("should execute a SQL query and return results", async () => {
			const docs: TestDoc[] = [
				{ id: "1", projectId: "p1", name: "one" },
				{ id: "2", projectId: "p1", name: "two" },
			];
			const mockIterator = {
				fetchNext: vi.fn().mockResolvedValue({
					resources: docs,
					continuationToken: undefined,
					requestCharge: 3.5,
				}),
			};
			const container = createMockContainer();
			vi.mocked(container.items.query).mockReturnValue(mockIterator as never);

			const repo = new Repository<TestDoc>(container, "test");
			const result = await repo.query(
				{
					query: "SELECT * FROM c WHERE c.projectId = @pid",
					parameters: [{ name: "@pid", value: "p1" }],
				},
				"p1",
			);

			expect(result.items).toHaveLength(2);
			expect(result.requestCharge).toBe(3.5);
		});
	});

	describe("queryAll", () => {
		it("should auto-paginate and return all results", async () => {
			let callCount = 0;
			const mockIterator = {
				hasMoreResults: vi.fn(() => callCount < 2),
				fetchNext: vi.fn(() => {
					callCount++;
					if (callCount === 1) {
						return Promise.resolve({
							resources: [{ id: "1", projectId: "p1", name: "one" }],
						});
					}
					return Promise.resolve({
						resources: [{ id: "2", projectId: "p1", name: "two" }],
					});
				}),
			};
			const container = createMockContainer();
			vi.mocked(container.items.query).mockReturnValue(mockIterator as never);

			const repo = new Repository<TestDoc>(container, "test");
			const results = await repo.queryAll({ query: "SELECT * FROM c" }, "p1");

			expect(results).toHaveLength(2);
			expect(results[0]?.name).toBe("one");
			expect(results[1]?.name).toBe("two");
		});
	});
});
