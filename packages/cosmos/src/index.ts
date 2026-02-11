/**
 * @blueflame/cosmos — Azure Cosmos DB wrapper
 *
 * All Cosmos DB operations go through this package.
 * Apps should never import @azure/cosmos directly.
 */

// Client
export { getClient, getContainer, getDatabase, resetClient } from "./client.js";

// Config
export { CONTAINERS, type ContainerName, type CosmosConfig, getCosmosConfig } from "./config.js";

// Errors
export {
	ConflictError,
	CosmosError,
	NotFoundError,
	PreconditionError,
	TooManyRequestsError,
	wrapCosmosError,
} from "./errors.js";

// Repository
export {
	type CosmosDocument,
	type PagedResult,
	type QueryOptions,
	Repository,
} from "./repository.js";
