/**
 * Database singleton — instantiates all 8 Cosmos DB repositories.
 *
 * Import `db` from this module in services that need persistence.
 * In tests, mock this module with `vi.mock("../db.js")`.
 *
 * When COSMOS_ENDPOINT is not set, falls back to the Cosmos emulator.
 */

import {
	AgentsRepository,
	ConstraintsRepository,
	DocumentsRepository,
	FailuresRepository,
	LocksRepository,
	PlansRepository,
	RunsRepository,
	SpecsRepository,
	getContainer,
} from "@blueflame/cosmos";

export const db = {
	specs: new SpecsRepository(getContainer("specs")),
	plans: new PlansRepository(getContainer("plans")),
	locks: new LocksRepository(getContainer("locks")),
	runs: new RunsRepository(getContainer("runs")),
	agents: new AgentsRepository(getContainer("agents")),
	constraints: new ConstraintsRepository(getContainer("constraints")),
	documents: new DocumentsRepository(getContainer("documents")),
	failures: new FailuresRepository(getContainer("failures")),
};

export type Db = typeof db;
