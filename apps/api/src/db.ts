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
	ProjectsRepository,
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
let _projects: ProjectsRepository | null = null;

function lazySpecs() {
	if (!_specs) _specs = new SpecsRepository(getContainer("specs"));
	return _specs;
}
function lazyPlans() {
	if (!_plans) _plans = new PlansRepository(getContainer("plans"));
	return _plans;
}
function lazyLocks() {
	if (!_locks) _locks = new LocksRepository(getContainer("locks"));
	return _locks;
}
function lazyRuns() {
	if (!_runs) _runs = new RunsRepository(getContainer("runs"));
	return _runs;
}
function lazyAgents() {
	if (!_agents) _agents = new AgentsRepository(getContainer("agents"));
	return _agents;
}
function lazyConstraints() {
	if (!_constraints) _constraints = new ConstraintsRepository(getContainer("constraints"));
	return _constraints;
}
function lazyDocuments() {
	if (!_documents) _documents = new DocumentsRepository(getContainer("documents"));
	return _documents;
}
function lazyFailures() {
	if (!_failures) _failures = new FailuresRepository(getContainer("failures"));
	return _failures;
}
function lazyProjects() {
	if (!_projects) _projects = new ProjectsRepository(getContainer("projects"));
	return _projects;
}

export const db = {
	get specs() {
		return lazySpecs();
	},
	get plans() {
		return lazyPlans();
	},
	get locks() {
		return lazyLocks();
	},
	get runs() {
		return lazyRuns();
	},
	get agents() {
		return lazyAgents();
	},
	get constraints() {
		return lazyConstraints();
	},
	get documents() {
		return lazyDocuments();
	},
	get failures() {
		return lazyFailures();
	},
	get projects() {
		return lazyProjects();
	},
};

export type Db = typeof db;
