/**
 * Cosmos DB configuration — reads from environment variables.
 *
 * Supports both Azure Cosmos DB and local emulator.
 * Emulator: https://localhost:8081 with well-known key.
 */

import { z } from "zod";

const EMULATOR_ENDPOINT = "https://localhost:8081";
const EMULATOR_KEY =
	"C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==";

const CosmosConfigSchema = z.object({
	endpoint: z.string().url(),
	key: z.string().min(1),
	databaseName: z.string().min(1),
	useEmulator: z.boolean(),
});

export type CosmosConfig = z.infer<typeof CosmosConfigSchema>;

/**
 * Reads Cosmos DB configuration from environment variables.
 * Falls back to emulator settings when COSMOS_USE_EMULATOR=true or endpoint is not set.
 */
export function getCosmosConfig(): CosmosConfig {
	const useEmulator = process.env.COSMOS_USE_EMULATOR === "true" || !process.env.COSMOS_ENDPOINT;

	const raw = {
		endpoint: useEmulator ? EMULATOR_ENDPOINT : (process.env.COSMOS_ENDPOINT ?? EMULATOR_ENDPOINT),
		key: useEmulator ? EMULATOR_KEY : (process.env.COSMOS_KEY ?? EMULATOR_KEY),
		databaseName: process.env.COSMOS_DATABASE ?? "blueflame",
		useEmulator,
	};

	return CosmosConfigSchema.parse(raw);
}

/** Container names matching the Bicep definitions */
export const CONTAINERS = {
	specs: "specs",
	plans: "plans",
	locks: "locks",
	runs: "runs",
	agents: "agents",
	constraints: "constraints",
	documents: "documents",
	failures: "failures",
	// Future: migrate to /orgId for multi-tenant and portfolio-level partitioning
	projects: "projects",
} as const;

export type ContainerName = (typeof CONTAINERS)[keyof typeof CONTAINERS];
