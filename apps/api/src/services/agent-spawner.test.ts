import { AgentRole, AgentStatus } from "@blueflame/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../db.js");

import { clearAllMockStores } from "../__mocks__/db.js";
import {
	clearAllAgents,
	getAgent,
	getAgentsByRunId,
	getRunTotalCost,
	onAgentStateChange,
	recordAgentUsage,
	spawnAgent,
	updateAgentStatus,
} from "./agent-spawner.js";

afterEach(() => {
	clearAllAgents();
	clearAllMockStores();
});

describe("spawnAgent", () => {
	it("should create an agent with Idle status", async () => {
		const agent = await spawnAgent("run-1", AgentRole.Builder, "TASK-001", "gpt-4o");
		expect(agent.runId).toBe("run-1");
		expect(agent.role).toBe(AgentRole.Builder);
		expect(agent.taskId).toBe("TASK-001");
		expect(agent.status).toBe(AgentStatus.Idle);
		expect(agent.tokensUsed).toBe(0);
		expect(agent.costIncurred).toBe(0);
	});

	it("should generate unique agent IDs", async () => {
		const a1 = await spawnAgent("run-1", AgentRole.Builder, "TASK-001", "gpt-4o");
		const a2 = await spawnAgent("run-1", AgentRole.Builder, "TASK-002", "gpt-4o");
		expect(a1.agentId).not.toBe(a2.agentId);
	});

	it("should notify callback on spawn", async () => {
		const callback = vi.fn();
		onAgentStateChange(callback);
		await spawnAgent("run-1", AgentRole.Builder, "TASK-001", "gpt-4o");
		expect(callback).toHaveBeenCalledTimes(1);
	});
});

describe("updateAgentStatus", () => {
	it("should update agent status", async () => {
		const agent = await spawnAgent("run-1", AgentRole.Builder, "TASK-001", "gpt-4o");
		const updated = await updateAgentStatus(agent.agentId, AgentStatus.Executing);
		expect(updated?.status).toBe(AgentStatus.Executing);
	});

	it("should return undefined for unknown agent", async () => {
		const result = await updateAgentStatus("unknown", AgentStatus.Executing);
		expect(result).toBeUndefined();
	});

	it("should notify callback on status change", async () => {
		const callback = vi.fn();
		onAgentStateChange(callback);
		const agent = await spawnAgent("run-1", AgentRole.Builder, "TASK-001", "gpt-4o");
		await updateAgentStatus(agent.agentId, AgentStatus.Executing);
		expect(callback).toHaveBeenCalledTimes(2); // spawn + update
	});
});

describe("recordAgentUsage", () => {
	it("should accumulate tokens and cost", async () => {
		const agent = await spawnAgent("run-1", AgentRole.Builder, "TASK-001", "gpt-4o");
		await recordAgentUsage(agent.agentId, 1000, 0.05);
		await recordAgentUsage(agent.agentId, 500, 0.03);
		const updated = getAgent(agent.agentId);
		expect(updated?.tokensUsed).toBe(1500);
		expect(updated?.costIncurred).toBeCloseTo(0.08);
	});

	it("should update sigma value when provided", async () => {
		const agent = await spawnAgent("run-1", AgentRole.Builder, "TASK-001", "gpt-4o");
		await recordAgentUsage(agent.agentId, 1000, 0.05, 0.42);
		expect(getAgent(agent.agentId)?.sigmaValue).toBe(0.42);
	});

	it("should return undefined for unknown agent", async () => {
		const result = await recordAgentUsage("unknown", 100, 0.01);
		expect(result).toBeUndefined();
	});
});

describe("getAgentsByRunId", () => {
	it("should return all agents for a run", async () => {
		await spawnAgent("run-1", AgentRole.Builder, "TASK-001", "gpt-4o");
		await spawnAgent("run-1", AgentRole.Verifier, "TASK-001", "gpt-4o");
		await spawnAgent("run-2", AgentRole.Builder, "TASK-001", "gpt-4o");

		const agents = getAgentsByRunId("run-1");
		expect(agents).toHaveLength(2);
	});

	it("should return empty array for unknown run", () => {
		expect(getAgentsByRunId("unknown")).toEqual([]);
	});
});

describe("getRunTotalCost", () => {
	it("should sum cost across all agents for a run", async () => {
		const a1 = await spawnAgent("run-1", AgentRole.Builder, "TASK-001", "gpt-4o");
		const a2 = await spawnAgent("run-1", AgentRole.Verifier, "TASK-001", "gpt-4o");
		await recordAgentUsage(a1.agentId, 1000, 0.1);
		await recordAgentUsage(a2.agentId, 500, 0.05);

		expect(getRunTotalCost("run-1")).toBeCloseTo(0.15);
	});

	it("should return 0 for run with no agents", () => {
		expect(getRunTotalCost("unknown")).toBe(0);
	});
});
