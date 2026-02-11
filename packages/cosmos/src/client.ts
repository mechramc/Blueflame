/**
 * Cosmos DB client — singleton wrapper for @azure/cosmos.
 *
 * All apps should use this client instead of importing @azure/cosmos directly.
 * Supports both Azure Cosmos DB and local emulator.
 */

import { type Container, CosmosClient, type Database } from "@azure/cosmos";
import { type ContainerName, type CosmosConfig, getCosmosConfig } from "./config.js";

let client: CosmosClient | null = null;
let database: Database | null = null;

/**
 * Returns the singleton CosmosClient, creating it on first call.
 */
export function getClient(config?: CosmosConfig): CosmosClient {
	if (!client) {
		const cfg = config ?? getCosmosConfig();
		client = new CosmosClient({
			endpoint: cfg.endpoint,
			key: cfg.key,
			connectionPolicy: {
				requestTimeout: 10000,
				retryOptions: {
					maxRetryAttemptCount: 5,
					fixedRetryIntervalInMilliseconds: 0,
					maxWaitTimeInSeconds: 30,
				},
			},
		});
	}
	return client;
}

/**
 * Returns the Blueflame database reference.
 */
export function getDatabase(config?: CosmosConfig): Database {
	if (!database) {
		const cfg = config ?? getCosmosConfig();
		database = getClient(cfg).database(cfg.databaseName);
	}
	return database;
}

/**
 * Returns a typed container reference by name.
 */
export function getContainer(containerName: ContainerName, config?: CosmosConfig): Container {
	return getDatabase(config).container(containerName);
}

/**
 * Resets the singleton client (for testing).
 */
export function resetClient(): void {
	client = null;
	database = null;
}
