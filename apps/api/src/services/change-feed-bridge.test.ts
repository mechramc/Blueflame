import {
	CHANGE_FEED_EVENTS,
	type ChangeFeedListener,
	type ChangeFeedProcessor,
} from "@blueflame/cosmos";
import { AgentRole, AgentStatus, RunStatus } from "@blueflame/shared";
import { describe, expect, it, vi } from "vitest";
import { startChangeFeedBridge } from "./change-feed-bridge.js";

function createMockProcessor() {
	let registeredListener: ChangeFeedListener | null = null;
	return {
		on: vi.fn((listener: ChangeFeedListener) => {
			registeredListener = listener;
		}),
		off: vi.fn(),
		start: vi.fn(),
		stop: vi.fn(),
		/** Simulate emitting an event to the registered listener */
		simulateEvent(event: Parameters<ChangeFeedListener>[0]) {
			registeredListener?.(event);
		},
	} as unknown as ChangeFeedProcessor & {
		simulateEvent: (event: Parameters<ChangeFeedListener>[0]) => void;
	};
}

function createMockHub() {
	const emitFn = vi.fn();
	return {
		to: vi.fn().mockReturnValue({ emit: emitFn }),
		_emit: emitFn,
	};
}

describe("startChangeFeedBridge", () => {
	it("should register listener and start processor", () => {
		const processor = createMockProcessor();
		const hub = createMockHub();

		startChangeFeedBridge(processor as unknown as ChangeFeedProcessor, hub as never);

		expect(processor.on).toHaveBeenCalled();
		expect(processor.start).toHaveBeenCalled();
	});

	it("should route RunStatusChanged to run:status on correct room", () => {
		const processor = createMockProcessor();
		const hub = createMockHub();

		startChangeFeedBridge(processor as unknown as ChangeFeedProcessor, hub as never);

		processor.simulateEvent({
			type: CHANGE_FEED_EVENTS.RunStatusChanged,
			runId: "run-42",
			projectId: "proj-1",
			previousStatus: RunStatus.Pending,
			currentStatus: RunStatus.Authorized,
			costActual: 0,
			costBudget: 100,
			timestamp: "2026-01-01T00:00:00Z",
		});

		expect(hub.to).toHaveBeenCalledWith("run:run-42");
		expect(hub._emit).toHaveBeenCalledWith("run:status", {
			runId: "run-42",
			status: RunStatus.Authorized,
			updatedAt: "2026-01-01T00:00:00Z",
		});
	});

	it("should route AgentStateChanged to agent:state on correct room", () => {
		const processor = createMockProcessor();
		const hub = createMockHub();

		startChangeFeedBridge(processor as unknown as ChangeFeedProcessor, hub as never);

		processor.simulateEvent({
			type: CHANGE_FEED_EVENTS.AgentStateChanged,
			agentId: "agent-1",
			runId: "run-42",
			role: AgentRole.Builder,
			previousStatus: null,
			currentStatus: AgentStatus.Executing,
			taskId: "task-1",
			tokensUsed: 100,
			costIncurred: 0.01,
			timestamp: "2026-01-01T00:00:00Z",
		});

		expect(hub.to).toHaveBeenCalledWith("run:run-42");
		expect(hub._emit).toHaveBeenCalledWith("agent:state", {
			runId: "run-42",
			agentId: "agent-1",
			role: AgentRole.Builder,
			status: AgentStatus.Executing,
			updatedAt: "2026-01-01T00:00:00Z",
		});
	});

	it("should route CostUpdated to budget:alert on correct room", () => {
		const processor = createMockProcessor();
		const hub = createMockHub();

		startChangeFeedBridge(processor as unknown as ChangeFeedProcessor, hub as never);

		processor.simulateEvent({
			type: CHANGE_FEED_EVENTS.CostUpdated,
			runId: "run-42",
			costActual: 85,
			costBudget: 100,
			percentUsed: 85,
			timestamp: "2026-01-01T00:00:00Z",
		});

		expect(hub.to).toHaveBeenCalledWith("run:run-42");
		expect(hub._emit).toHaveBeenCalledWith("budget:alert", {
			runId: "run-42",
			currentSpend: 85,
			ceiling: 100,
			percentUsed: 85,
		});
	});

	it("should return cleanup function that stops processor and removes listener", () => {
		const processor = createMockProcessor();
		const hub = createMockHub();

		const cleanup = startChangeFeedBridge(
			processor as unknown as ChangeFeedProcessor,
			hub as never,
		);

		cleanup();

		expect(processor.stop).toHaveBeenCalled();
		expect(processor.off).toHaveBeenCalled();
	});
});
