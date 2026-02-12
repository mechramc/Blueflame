/**
 * Cosmos DB connection smoke test.
 *
 * Usage: npx tsx scripts/test-cosmos-connection.ts
 *
 * Verifies that the Cosmos DB endpoint, key, and database are reachable,
 * and that all 8 expected containers exist.
 */

import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(import.meta.dirname, "..", ".env") });

import { CONTAINERS, getClient, getCosmosConfig, getDatabase } from "@blueflame/cosmos";

async function main() {
	console.log("=== Blueflame Cosmos DB Smoke Test ===\n");

	const cfg = getCosmosConfig();
	console.log(`Endpoint:  ${cfg.endpoint}`);
	console.log(`Database:  ${cfg.databaseName}`);
	console.log(`Emulator:  ${cfg.useEmulator}\n`);

	// 1. Test client connection
	console.log("1. Testing client connection...");
	const client = getClient(cfg);
	const { resource: account } = await client.getDatabaseAccount();
	console.log(
		`   ✓ Connected — writable regions: ${account.writableLocations?.map((l) => l.name).join(", ") ?? "unknown"}\n`,
	);

	// 2. Test database exists
	console.log("2. Testing database access...");
	const db = getDatabase(cfg);
	const { resource: dbResource } = await db.read();
	console.log(`   ✓ Database "${dbResource?.id}" found\n`);

	// 3. Test all 8 containers
	console.log("3. Testing containers...");
	const containerNames = Object.values(CONTAINERS);
	let allFound = true;

	for (const name of containerNames) {
		try {
			const container = db.container(name);
			const { resources } = await container.items
				.query({ query: "SELECT VALUE COUNT(1) FROM c" })
				.fetchNext();
			const count = resources?.[0] ?? 0;
			console.log(`   ✓ ${name.padEnd(12)} — ${count} documents`);
		} catch (err) {
			allFound = false;
			const msg = err instanceof Error ? err.message : String(err);
			console.log(`   ✗ ${name.padEnd(12)} — ERROR: ${msg}`);
		}
	}

	console.log();
	if (allFound) {
		console.log("=== All checks passed! Cosmos DB is ready. ===");
	} else {
		console.log("=== Some containers missing — create them in Azure Portal. ===");
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("\nFATAL:", err instanceof Error ? err.message : err);
	process.exit(1);
});
