/**
 * Cosmos DB error types — typed wrappers for SDK errors.
 */

/** Base class for all Cosmos DB errors */
export class CosmosError extends Error {
	constructor(
		message: string,
		public readonly statusCode: number,
		public readonly activityId?: string,
	) {
		super(message);
		this.name = "CosmosError";
	}
}

/** Document not found (404) */
export class NotFoundError extends CosmosError {
	constructor(container: string, id: string, partitionKey: string) {
		super(`Document not found: ${container}/${id} (partition: ${partitionKey})`, 404);
		this.name = "NotFoundError";
	}
}

/** Conflict — document already exists (409) */
export class ConflictError extends CosmosError {
	constructor(container: string, id: string) {
		super(`Document already exists: ${container}/${id}`, 409);
		this.name = "ConflictError";
	}
}

/** Precondition failed — ETag mismatch (412) */
export class PreconditionError extends CosmosError {
	constructor(container: string, id: string) {
		super(`ETag mismatch (concurrent update): ${container}/${id}`, 412);
		this.name = "PreconditionError";
	}
}

/** Rate limit exceeded (429) — should be retried */
export class TooManyRequestsError extends CosmosError {
	constructor(
		public readonly retryAfterMs: number,
		activityId?: string,
	) {
		super(`Rate limited — retry after ${retryAfterMs}ms`, 429, activityId);
		this.name = "TooManyRequestsError";
	}
}

/**
 * Wraps a raw Cosmos SDK error into a typed error.
 * Returns the original error if it doesn't match known patterns.
 */
export function wrapCosmosError(err: unknown, container: string, id?: string): CosmosError {
	if (err instanceof CosmosError) return err;

	const code = (err as { code?: number })?.code;
	const body = (err as { body?: { message?: string } })?.body;
	const message = body?.message ?? (err instanceof Error ? err.message : String(err));
	const activityId = (err as { activityId?: string })?.activityId;

	switch (code) {
		case 404:
			return new NotFoundError(container, id ?? "unknown", "unknown");
		case 409:
			return new ConflictError(container, id ?? "unknown");
		case 412:
			return new PreconditionError(container, id ?? "unknown");
		case 429: {
			const retryAfter = (err as { retryAfterInMs?: number })?.retryAfterInMs ?? 1000;
			return new TooManyRequestsError(retryAfter, activityId);
		}
		default:
			return new CosmosError(message, code ?? 500, activityId);
	}
}
