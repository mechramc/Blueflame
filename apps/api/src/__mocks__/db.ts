/**
 * In-memory mock of the db singleton for tests.
 *
 * Provides Map-backed implementations of all repository methods
 * so that tests don't need a real Cosmos DB connection.
 *
 * Usage in test files:
 *   vi.mock("../db.js");  // Vitest auto-finds this __mocks__/db.ts
 */

import type { Result } from "@blueflame/shared";

type Doc = { id: string; [key: string]: unknown };

function createMockRepo<T extends Doc>() {
	const store = new Map<string, T>();

	return {
		_store: store,
		_clear: () => store.clear(),

		create: async (item: T, _pk: string): Promise<Result<T, Error>> => {
			if (store.has(item.id)) {
				return { ok: false, error: new Error(`Conflict: ${item.id}`) };
			}
			store.set(item.id, { ...item });
			return { ok: true, value: { ...item } };
		},

		read: async (id: string, _pk: string): Promise<Result<T, Error>> => {
			const item = store.get(id);
			if (!item) {
				return { ok: false, error: new Error(`Not found: ${id}`) };
			}
			return { ok: true, value: { ...item } };
		},

		update: async (item: T, _pk: string): Promise<Result<T, Error>> => {
			store.set(item.id, { ...item });
			return { ok: true, value: { ...item } };
		},

		delete: async (id: string, _pk: string): Promise<Result<void, Error>> => {
			if (!store.has(id)) {
				return { ok: false, error: new Error(`Not found: ${id}`) };
			}
			store.delete(id);
			return { ok: true, value: undefined };
		},

		query: async () => ({ items: [...store.values()], continuationToken: undefined, requestCharge: 0 }),

		queryAll: async (querySpec: { query: string; parameters?: Array<{ name: string; value: string }> }) => {
			const items = [...store.values()];
			// Simple parameter-based filtering for common patterns
			const params = querySpec.parameters ?? [];
			return items.filter((item) => {
				for (const p of params) {
					const fieldName = p.name.replace("@", "");
					// Map common param names to fields
					const fieldMap: Record<string, string> = {
						pid: "projectId",
						rid: "runId",
						id: "id",
						fid: "failureId",
						src: "source",
					};
					const actualField = fieldMap[fieldName] ?? fieldName;
					if ((item as Record<string, unknown>)[actualField] !== p.value) {
						return false;
					}
				}
				return true;
			}) as T[];
		},

		findByProject: async (projectId: string) =>
			[...store.values()]
				.filter((item) => (item as Record<string, unknown>).projectId === projectId)
				.sort((a, b) => {
					const aDate = (a as Record<string, unknown>).createdAt as string ?? "";
					const bDate = (b as Record<string, unknown>).createdAt as string ?? "";
					const dateCmp = bDate.localeCompare(aDate);
					if (dateCmp !== 0) return dateCmp;
					// Break ties by id DESC (later-created items have higher counters)
					const aId = (a as Record<string, unknown>).id as string ?? "";
					const bId = (b as Record<string, unknown>).id as string ?? "";
					return bId.localeCompare(aId);
				}) as T[],

		findByRun: async (runId: string, projectId?: string) => {
			const items = [...store.values()].filter((item) => {
				const rec = item as Record<string, unknown>;
				if (rec.runId !== runId) return false;
				if (projectId && rec.projectId !== projectId) return false;
				return true;
			});
			return items[0] ?? null;
		},

		findBySource: async (source: string, projectId: string) =>
			[...store.values()].filter((item) => {
				const rec = item as Record<string, unknown>;
				return rec.source === source && rec.projectId === projectId;
			}) as T[],
	};
}

function createSpecsRepo<T extends Doc>() {
	const base = createMockRepo<T>();
	return {
		...base,
		freeze: async (specId: string, _projectId: string): Promise<Result<T, Error>> => {
			const item = base._store.get(specId);
			if (!item) {
				return { ok: false, error: new Error(`Not found: ${specId}`) };
			}
			const spec = item as Record<string, unknown>;
			if (spec.status === "FROZEN") {
				return { ok: false, error: new Error("Already frozen") };
			}
			// Simulate freeze: set status, compute hash placeholder, increment version
			const { createHash } = await import("node:crypto");
			const hash = createHash("sha256").update(spec.content as string).digest("hex");
			const frozen = {
				...item,
				status: "FROZEN",
				specHash: hash,
				version: ((spec.version as number) ?? 0) + 1,
				updatedAt: new Date().toISOString(),
			} as T;
			base._store.set(specId, frozen);
			return { ok: true, value: { ...frozen } };
		},
	};
}

function createLocksRepo<T extends Doc>() {
	const store = new Map<string, T>();
	return {
		_store: store,
		_clear: () => store.clear(),
		create: async (item: T, _pk: string): Promise<Result<T, Error>> => {
			if (store.has(item.id)) {
				return { ok: false, error: new Error(`Conflict: ${item.id}`) };
			}
			store.set(item.id, { ...item });
			return { ok: true, value: { ...item } };
		},
		read: async (id: string, _pk: string): Promise<Result<T, Error>> => {
			const item = store.get(id);
			if (!item) {
				return { ok: false, error: new Error(`Not found: ${id}`) };
			}
			return { ok: true, value: { ...item } };
		},
		findByRun: async (runId: string) => {
			const items = [...store.values()].filter(
				(item) => (item as Record<string, unknown>).runId === runId,
			);
			return items[0] ?? null;
		},
	};
}

export const db = {
	specs: createSpecsRepo(),
	plans: createMockRepo(),
	locks: createLocksRepo(),
	runs: createMockRepo(),
	agents: createMockRepo(),
	constraints: createMockRepo(),
	documents: createMockRepo(),
	failures: createMockRepo(),
};

/** Helper to clear all mock stores between tests */
export function clearAllMockStores(): void {
	db.specs._clear();
	db.plans._clear();
	db.locks._clear();
	db.runs._clear();
	db.agents._clear();
	db.constraints._clear();
	db.documents._clear();
	db.failures._clear();
}
