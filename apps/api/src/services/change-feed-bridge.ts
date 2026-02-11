/**
 * Change feed → SignalR bridge.
 *
 * Listens for Cosmos DB change feed events and emits them to SignalR clients
 * subscribed to the relevant run rooms. This is the backbone of real-time
 * dashboard updates.
 */

import {
	CHANGE_FEED_EVENTS,
	type ChangeFeedEvent,
	type ChangeFeedProcessor,
} from "@blueflame/cosmos";
import type { TypedServer } from "../signalr/hub.js";

/**
 * Connects a ChangeFeedProcessor to a SignalR hub, routing events to
 * the correct rooms and channels.
 *
 * @returns A cleanup function that stops the processor
 */
export function startChangeFeedBridge(
	processor: ChangeFeedProcessor,
	hub: TypedServer,
): () => void {
	const listener = (event: ChangeFeedEvent): void => {
		switch (event.type) {
			case CHANGE_FEED_EVENTS.RunStatusChanged:
				hub.to(`run:${event.runId}`).emit("run:status", {
					runId: event.runId,
					status: event.currentStatus,
					updatedAt: event.timestamp,
				});
				break;

			case CHANGE_FEED_EVENTS.AgentStateChanged:
				hub.to(`run:${event.runId}`).emit("agent:state", {
					runId: event.runId,
					agentId: event.agentId,
					role: event.role,
					status: event.currentStatus,
					updatedAt: event.timestamp,
				});
				break;

			case CHANGE_FEED_EVENTS.CostUpdated:
				hub.to(`run:${event.runId}`).emit("budget:alert", {
					runId: event.runId,
					currentSpend: event.costActual,
					ceiling: event.costBudget,
					percentUsed: event.percentUsed,
				});
				break;
		}
	};

	processor.on(listener);
	processor.start();

	return () => {
		processor.stop();
		processor.off(listener);
	};
}
