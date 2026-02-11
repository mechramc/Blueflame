/**
 * LocksRepository — CREATE and READ ONLY for PlanLock documents.
 *
 * Partition key: /runId
 *
 * IMMUTABILITY: PlanLock documents must NEVER be updated or deleted.
 * This repository intentionally does NOT expose update() or delete() methods.
 */

import type { Container } from "@azure/cosmos";
import type { PlanLock, Result } from "@blueflame/shared";
import type { CosmosError } from "../errors.js";
import type { NotFoundError } from "../errors.js";
import { Repository } from "../repository.js";

/**
 * Internal repository that we inherit from but restrict.
 * The public API only exposes create() and read().
 */
class BaseLocksRepository extends Repository<PlanLock> {
	constructor(container: Container) {
		super(container, "locks");
	}
}

export class LocksRepository {
	private readonly base: BaseLocksRepository;

	constructor(container: Container) {
		this.base = new BaseLocksRepository(container);
	}

	/** Create an immutable plan lock */
	async create(lock: PlanLock, partitionKey: string): Promise<Result<PlanLock, CosmosError>> {
		return this.base.create(lock, partitionKey);
	}

	/** Read a plan lock by ID */
	async read(id: string, partitionKey: string): Promise<Result<PlanLock, NotFoundError>> {
		return this.base.read(id, partitionKey);
	}

	/** Find the lock for a given run */
	async findByRun(runId: string): Promise<PlanLock | null> {
		const results = await this.base.queryAll(
			{
				query: "SELECT * FROM c WHERE c.runId = @rid",
				parameters: [{ name: "@rid", value: runId }],
			},
			runId,
		);
		return results[0] ?? null;
	}
}
