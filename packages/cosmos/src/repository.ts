/**
 * Base repository — typed CRUD operations on a Cosmos DB container.
 *
 * Generic `Repository<T>` ensures type safety across all 7 containers.
 * Includes retry with exponential backoff on transient errors (429).
 */

import type { Container, FeedOptions, SqlQuerySpec } from "@azure/cosmos";
import type { Result } from "@blueflame/shared";
import {
	ConflictError,
	CosmosError,
	NotFoundError,
	TooManyRequestsError,
	wrapCosmosError,
} from "./errors.js";

/** Common fields on all Cosmos DB documents */
export interface CosmosDocument {
	id: string;
	/** ETag for optimistic concurrency */
	_etag?: string;
	/** Timestamp */
	_ts?: number;
}

/** Options for query operations */
export interface QueryOptions {
	maxItemCount?: number;
	continuationToken?: string;
}

/** Result of a paginated query */
export interface PagedResult<T> {
	items: T[];
	continuationToken?: string;
	requestCharge: number;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

/**
 * Retries an operation on transient errors (429) with exponential backoff.
 */
async function withRetry<T>(
	operation: () => Promise<T>,
	container: string,
	operationName: string,
): Promise<T> {
	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			return await operation();
		} catch (err) {
			const cosmosErr = wrapCosmosError(err, container);
			if (cosmosErr instanceof TooManyRequestsError && attempt < MAX_RETRIES) {
				const delay = Math.max(cosmosErr.retryAfterMs, BASE_DELAY_MS * 2 ** attempt);
				console.warn(
					`[Cosmos] ${operationName} rate limited, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`,
				);
				await new Promise((resolve) => setTimeout(resolve, delay));
				continue;
			}
			throw cosmosErr;
		}
	}
	// Unreachable, but TypeScript needs it
	throw new CosmosError("Max retries exceeded", 429);
}

/**
 * Base repository with typed CRUD + query operations.
 *
 * Usage:
 *   const repo = new Repository<Run>(container, "runs");
 *   const run = await repo.read("run-123", "project-abc");
 */
export class Repository<T extends CosmosDocument> {
	constructor(
		protected readonly container: Container,
		protected readonly containerName: string,
	) {}

	/**
	 * Create a new document. Returns error on conflict (409).
	 */
	async create(item: T, _partitionKey: string): Promise<Result<T, CosmosError>> {
		try {
			const { resource } = await withRetry(
				() => this.container.items.create(item),
				this.containerName,
				"create",
			);
			return { ok: true, value: resource as T };
		} catch (err) {
			if (err instanceof ConflictError) {
				return { ok: false, error: err };
			}
			throw err;
		}
	}

	/**
	 * Read a document by ID and partition key.
	 */
	async read(id: string, partitionKey: string): Promise<Result<T, NotFoundError>> {
		try {
			const { resource } = await withRetry(
				() => this.container.item(id, partitionKey).read<T>(),
				this.containerName,
				"read",
			);
			if (!resource) {
				return {
					ok: false,
					error: new NotFoundError(this.containerName, id, partitionKey),
				};
			}
			return { ok: true, value: resource };
		} catch (err) {
			if (err instanceof NotFoundError) {
				return { ok: false, error: err };
			}
			throw err;
		}
	}

	/**
	 * Update (replace) a document. Uses ETag for optimistic concurrency.
	 */
	async update(item: T, partitionKey: string): Promise<Result<T, CosmosError>> {
		try {
			const { resource } = await withRetry(
				() =>
					this.container.item(item.id, partitionKey).replace<T>(item, {
						accessCondition: item._etag ? { type: "IfMatch", condition: item._etag } : undefined,
					}),
				this.containerName,
				"update",
			);
			return { ok: true, value: resource as T };
		} catch (err) {
			if (err instanceof CosmosError) {
				return { ok: false, error: err };
			}
			throw err;
		}
	}

	/**
	 * Delete a document by ID and partition key.
	 */
	async delete(id: string, partitionKey: string): Promise<Result<void, NotFoundError>> {
		try {
			await withRetry(
				() => this.container.item(id, partitionKey).delete(),
				this.containerName,
				"delete",
			);
			return { ok: true, value: undefined };
		} catch (err) {
			if (err instanceof NotFoundError) {
				return { ok: false, error: err };
			}
			throw err;
		}
	}

	/**
	 * Query documents using SQL API.
	 *
	 * Usage:
	 *   const result = await repo.query(
	 *     { query: "SELECT * FROM c WHERE c.projectId = @pid", parameters: [{ name: "@pid", value: "abc" }] },
	 *     "abc"
	 *   );
	 */
	async query(
		querySpec: SqlQuerySpec,
		partitionKey?: string,
		options?: QueryOptions,
	): Promise<PagedResult<T>> {
		const feedOptions: FeedOptions = {
			maxItemCount: options?.maxItemCount ?? 100,
			continuationToken: options?.continuationToken,
			partitionKey: partitionKey ? [partitionKey] : undefined,
		};

		const { resources, continuationToken, requestCharge } = await withRetry(
			() => this.container.items.query<T>(querySpec, feedOptions).fetchNext(),
			this.containerName,
			"query",
		);

		return {
			items: resources ?? [],
			continuationToken: continuationToken ?? undefined,
			requestCharge: requestCharge ?? 0,
		};
	}

	/**
	 * Query all matching documents (auto-pagination).
	 */
	async queryAll(querySpec: SqlQuerySpec, partitionKey?: string): Promise<T[]> {
		const iterator = this.container.items.query<T>(querySpec, {
			partitionKey: partitionKey ? [partitionKey] : undefined,
		});

		const items: T[] = [];
		while (iterator.hasMoreResults()) {
			const { resources } = await iterator.fetchNext();
			if (resources) {
				items.push(...resources);
			}
		}
		return items;
	}
}
