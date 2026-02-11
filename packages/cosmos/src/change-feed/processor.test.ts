import type { Container } from "@azure/cosmos";
import { AgentRole, AgentStatus, RunStatus } from "@blueflame/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHANGE_FEED_EVENTS, type ChangeFeedEvent } from "./events.js";
import { ChangeFeedProcessor } from "./processor.js";

function createMockContainer(): Container {
	const fetchNext = vi.fn().mockResolvedValue({ result: [], continuation: undefined });
	return {
		items: {
			changeFeed: vi.fn().mockReturnValue({ fetchNext }),
		},
	} as unknown as Container;
}

function getChangeFeedMock(container: Container) {
	return vi.mocked(container.items.changeFeed);
}

function setFeedResult(container: Container, result: unknown[], continuation?: string) {
	const fetchNext = vi.fn().mockResolvedValue({ result, continuation });
	getChangeFeedMock(container).mockReturnValue({ fetchNext } as never);
}

describe("ChangeFeedProcessor", () => {
	let runsContainer: Container;
	let agentsContainer: Container;
	let processor: ChangeFeedProcessor;

	beforeEach(() => {
		vi.useFakeTimers();
		runsContainer = createMockContainer();
		agentsContainer = createMockContainer();
		processor = new ChangeFeedProcessor(runsContainer, agentsContainer, {
			pollIntervalMs: 100,
		});
	});

	afterEach(() => {
		processor.stop();
		vi.useRealTimers();
	});

	it("should start and stop without error", () => {
		expect(processor.isRunning).toBe(false);
		processor.start();
		expect(processor.isRunning).toBe(true);
		processor.stop();
		expect(processor.isRunning).toBe(false);
	});

	it("should not start twice", () => {
		processor.start();
		processor.start(); // no-op
		expect(processor.isRunning).toBe(true);
	});

	it("should emit RunStatusChanged when run document changes status", async () => {
		const events: ChangeFeedEvent[] = [];
		processor.on((event) => events.push(event));

		setFeedResult(runsContainer, [
			{
				runId: "run-1",
				projectId: "proj-1",
				status: RunStatus.Authorized,
				costActual: 0,
				costBudget: 100,
			},
		]);

		processor.start();
		// Wait for the immediate poll to complete
		await vi.advanceTimersByTimeAsync(10);

		expect(events.length).toBeGreaterThanOrEqual(1);
		const runEvent = events.find((e) => e.type === CHANGE_FEED_EVENTS.RunStatusChanged);
		expect(runEvent).toBeDefined();
		if (runEvent?.type === CHANGE_FEED_EVENTS.RunStatusChanged) {
			expect(runEvent.runId).toBe("run-1");
			expect(runEvent.currentStatus).toBe(RunStatus.Authorized);
			expect(runEvent.previousStatus).toBeNull();
		}
	});

	it("should emit AgentStateChanged when agent document changes status", async () => {
		const events: ChangeFeedEvent[] = [];
		processor.on((event) => events.push(event));

		setFeedResult(agentsContainer, [
			{
				agentId: "agent-1",
				runId: "run-1",
				role: AgentRole.Builder,
				status: AgentStatus.Executing,
				taskId: "task-1",
				tokensUsed: 500,
				costIncurred: 0.05,
			},
		]);

		processor.start();
		await vi.advanceTimersByTimeAsync(10);

		const agentEvent = events.find((e) => e.type === CHANGE_FEED_EVENTS.AgentStateChanged);
		expect(agentEvent).toBeDefined();
		if (agentEvent?.type === CHANGE_FEED_EVENTS.AgentStateChanged) {
			expect(agentEvent.agentId).toBe("agent-1");
			expect(agentEvent.role).toBe(AgentRole.Builder);
			expect(agentEvent.currentStatus).toBe(AgentStatus.Executing);
			expect(agentEvent.previousStatus).toBeNull();
		}
	});

	it("should emit CostUpdated when run has costActual > 0", async () => {
		const events: ChangeFeedEvent[] = [];
		processor.on((event) => events.push(event));

		setFeedResult(runsContainer, [
			{
				runId: "run-1",
				projectId: "proj-1",
				status: RunStatus.Executing,
				costActual: 50,
				costBudget: 100,
			},
		]);

		processor.start();
		await vi.advanceTimersByTimeAsync(10);

		const costEvent = events.find((e) => e.type === CHANGE_FEED_EVENTS.CostUpdated);
		expect(costEvent).toBeDefined();
		if (costEvent?.type === CHANGE_FEED_EVENTS.CostUpdated) {
			expect(costEvent.runId).toBe("run-1");
			expect(costEvent.costActual).toBe(50);
			expect(costEvent.percentUsed).toBe(50);
		}
	});

	it("should not emit RunStatusChanged when status hasn't changed", async () => {
		const events: ChangeFeedEvent[] = [];
		processor.on((event) => events.push(event));

		// First poll — new document
		setFeedResult(runsContainer, [
			{
				runId: "run-1",
				projectId: "proj-1",
				status: RunStatus.Executing,
				costActual: 0,
				costBudget: 100,
			},
		]);

		processor.start();
		await vi.advanceTimersByTimeAsync(10);

		const firstCount = events.filter((e) => e.type === CHANGE_FEED_EVENTS.RunStatusChanged).length;
		expect(firstCount).toBe(1);

		// Second poll — same status
		setFeedResult(runsContainer, [
			{
				runId: "run-1",
				projectId: "proj-1",
				status: RunStatus.Executing,
				costActual: 10,
				costBudget: 100,
			},
		]);

		await vi.advanceTimersByTimeAsync(110);

		const secondCount = events.filter((e) => e.type === CHANGE_FEED_EVENTS.RunStatusChanged).length;
		// Should still be 1 — no new status change
		expect(secondCount).toBe(1);
	});

	it("should handle empty feed results gracefully", async () => {
		const events: ChangeFeedEvent[] = [];
		processor.on((event) => events.push(event));

		setFeedResult(runsContainer, []);
		setFeedResult(agentsContainer, []);

		processor.start();
		await vi.advanceTimersByTimeAsync(10);

		expect(events.length).toBe(0);
	});

	it("should handle feed errors gracefully and continue polling", async () => {
		const events: ChangeFeedEvent[] = [];
		processor.on((event) => events.push(event));

		// First poll — error
		const fetchNextError = vi.fn().mockRejectedValue(new Error("Connection lost"));
		getChangeFeedMock(runsContainer).mockReturnValue({ fetchNext: fetchNextError } as never);

		processor.start();
		await vi.advanceTimersByTimeAsync(10);

		expect(events.length).toBe(0);
		expect(processor.isRunning).toBe(true); // Still running despite error

		// Second poll — succeeds
		setFeedResult(runsContainer, [
			{
				runId: "run-1",
				projectId: "proj-1",
				status: RunStatus.Completed,
				costActual: 80,
				costBudget: 100,
			},
		]);

		await vi.advanceTimersByTimeAsync(110);

		const runEvent = events.find((e) => e.type === CHANGE_FEED_EVENTS.RunStatusChanged);
		expect(runEvent).toBeDefined();
	});

	it("should remove listener with off()", async () => {
		const events: ChangeFeedEvent[] = [];
		const listener = (event: ChangeFeedEvent) => events.push(event);
		processor.on(listener);

		setFeedResult(runsContainer, [
			{
				runId: "run-1",
				projectId: "proj-1",
				status: RunStatus.Pending,
				costActual: 0,
				costBudget: 100,
			},
		]);

		processor.start();
		await vi.advanceTimersByTimeAsync(10);
		expect(events.length).toBeGreaterThan(0);

		// Remove listener and poll again with new data
		processor.off(listener);
		const countBefore = events.length;

		setFeedResult(runsContainer, [
			{
				runId: "run-2",
				projectId: "proj-1",
				status: RunStatus.Authorized,
				costActual: 0,
				costBudget: 100,
			},
		]);

		await vi.advanceTimersByTimeAsync(110);
		expect(events.length).toBe(countBefore); // No new events
	});

	it("should track previousStatus correctly across multiple changes", async () => {
		const events: ChangeFeedEvent[] = [];
		processor.on((event) => events.push(event));

		// First: PENDING
		setFeedResult(runsContainer, [
			{
				runId: "run-1",
				projectId: "proj-1",
				status: RunStatus.Pending,
				costActual: 0,
				costBudget: 100,
			},
		]);

		processor.start();
		await vi.advanceTimersByTimeAsync(10);

		// Second: AUTHORIZED
		setFeedResult(runsContainer, [
			{
				runId: "run-1",
				projectId: "proj-1",
				status: RunStatus.Authorized,
				costActual: 0,
				costBudget: 100,
			},
		]);

		await vi.advanceTimersByTimeAsync(110);

		const statusEvents = events.filter((e) => e.type === CHANGE_FEED_EVENTS.RunStatusChanged);
		expect(statusEvents.length).toBe(2);

		if (statusEvents[0]?.type === CHANGE_FEED_EVENTS.RunStatusChanged) {
			expect(statusEvents[0].previousStatus).toBeNull();
			expect(statusEvents[0].currentStatus).toBe(RunStatus.Pending);
		}
		if (statusEvents[1]?.type === CHANGE_FEED_EVENTS.RunStatusChanged) {
			expect(statusEvents[1].previousStatus).toBe(RunStatus.Pending);
			expect(statusEvents[1].currentStatus).toBe(RunStatus.Authorized);
		}
	});

	it("should not crash if a listener throws", async () => {
		processor.on(() => {
			throw new Error("Listener blew up");
		});
		const events: ChangeFeedEvent[] = [];
		processor.on((event) => events.push(event));

		setFeedResult(runsContainer, [
			{
				runId: "run-1",
				projectId: "proj-1",
				status: RunStatus.Executing,
				costActual: 0,
				costBudget: 100,
			},
		]);

		processor.start();
		await vi.advanceTimersByTimeAsync(10);

		// Second listener still receives events
		expect(events.length).toBeGreaterThan(0);
	});
});
