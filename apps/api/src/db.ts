/**
 * Database singleton — lazily instantiates all 8 Cosmos DB repositories.
 *
 * Import `db` from this module in services that need persistence.
 * In tests, mock this module with `vi.mock("../db.js")`.
 *
 * Repositories are created lazily (on first access) to ensure
 * environment variables from dotenv are loaded before Cosmos client init.
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

let _specs: SpecsRepository | null = null;
let _plans: PlansRepository | null = null;
let _locks: LocksRepository | null = null;
let _runs: RunsRepository | null = null;
let _agents: AgentsRepository | null = null;
let _constraints: ConstraintsRepository | null = null;
let _documents: DocumentsRepository | null = null;
let _failures: FailuresRepository | null = null;

export const db = {
	get specs() {
		return (_specs ??= new SpecsRepository(getContainer("specs")));
	},
	get plans() {
		return (_plans ??= new PlansRepository(getContainer("plans")));
	},
	get locks() {
		return (_locks ??= new LocksRepository(getContainer("locks")));
	},
	get runs() {
		return (_runs ??= new RunsRepository(getContainer("runs")));
	},
	get agents() {
		return (_agents ??= new AgentsRepository(getContainer("agents")));
	},
	get constraints() {
		return (_constraints ??= new ConstraintsRepository(getContainer("constraints")));
	},
	get documents() {
		return (_documents ??= new DocumentsRepository(getContainer("documents")));
	},
	get failures() {
		return (_failures ??= new FailuresRepository(getContainer("failures")));
	},
};

export type Db = typeof db;
