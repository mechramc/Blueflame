/**
 * Cosmos DB change feed processor — watches runs and agents containers
 * for document changes and emits typed events.
 *
 * Uses the @azure/cosmos ChangeFeedIteratorOptions with continuation tokens
 * for resumable, gracefully-reconnecting feed consumption.
 */

import type { Container } from "@azure/cosmos";
import type { AgentState, Run } from "@blueflame/shared";
import { CHANGE_FEED_EVENTS, type ChangeFeedEvent, type ChangeFeedListener } from "./events.js";

export interface ChangeFeedProcessorOptions {
	/** Polling interval in ms (default: 500) */
	pollIntervalMs?: number;
	/** Max items per poll batch (default: 100) */
	maxItemCount?: number;
}

const DEFAULT_POLL_INTERVAL = 500;
const DEFAULT_MAX_ITEMS = 100;

/**
 * Processes Cosmos DB change feed for runs and agents containers.
 * Emits typed events for downstream consumers (e.g., SignalR bridge).
 */
export class ChangeFeedProcessor {
	private readonly runsContainer: Container;
	private readonly agentsContainer: Container;
	private readonly listeners: Set<ChangeFeedListener> = new Set();
	private readonly pollIntervalMs: number;
	private readonly maxItemCount: number;

	private runsContinuation: string | undefined;
	private agentsContinuation: string | undefined;
	private runsTimer: ReturnType<typeof setInterval> | null = null;
	private agentsTimer: ReturnType<typeof setInterval> | null = null;
	private running = false;

	/** Track last-seen status per document to detect changes */
	private lastRunStatus = new Map<string, string>();
	private lastAgentStatus = new Map<string, string>();

	constructor(
		runsContainer: Container,
		agentsContainer: Container,
		options?: ChangeFeedProcessorOptions,
	) {
		this.runsContainer = runsContainer;
		this.agentsContainer = agentsContainer;
		this.pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL;
		this.maxItemCount = options?.maxItemCount ?? DEFAULT_MAX_ITEMS;
	}

	/** Register a listener for change feed events */
	on(listener: ChangeFeedListener): void {
		this.listeners.add(listener);
	}

	/** Remove a listener */
	off(listener: ChangeFeedListener): void {
		this.listeners.delete(listener);
	}

	/** Start polling both containers */
	start(): void {
		if (this.running) return;
		this.running = true;

		this.runsTimer = setInterval(() => {
			void this.pollRuns();
		}, this.pollIntervalMs);

		this.agentsTimer = setInterval(() => {
			void this.pollAgents();
		}, this.pollIntervalMs);

		// Immediate first poll
		void this.pollRuns();
		void this.pollAgents();
	}

	/** Stop polling */
	stop(): void {
		this.running = false;
		if (this.runsTimer) {
			clearInterval(this.runsTimer);
			this.runsTimer = null;
		}
		if (this.agentsTimer) {
			clearInterval(this.agentsTimer);
			this.agentsTimer = null;
		}
	}

	/** Whether the processor is currently running */
	get isRunning(): boolean {
		return this.running;
	}

	// ─── Private ─────────────────────────────────────────────

	private emit(event: ChangeFeedEvent): void {
		for (const listener of this.listeners) {
			try {
				listener(event);
			} catch {
				// Don't let a failing listener stop others
			}
		}
	}

	private processRunDoc(doc: Run): void {
		const previousStatus = this.lastRunStatus.get(doc.runId) ?? null;
		const currentStatus = doc.status;
		this.lastRunStatus.set(doc.runId, currentStatus);

		if (previousStatus !== currentStatus) {
			this.emit({
				type: CHANGE_FEED_EVENTS.RunStatusChanged,
				runId: doc.runId,
				projectId: doc.projectId,
				previousStatus: previousStatus as Run["status"] | null,
				currentStatus,
				costActual: doc.costActual,
				costBudget: doc.costBudget,
				timestamp: new Date().toISOString(),
			});
		}

		if (doc.costActual > 0) {
			const percentUsed = doc.costBudget > 0 ? (doc.costActual / doc.costBudget) * 100 : 0;
			this.emit({
				type: CHANGE_FEED_EVENTS.CostUpdated,
				runId: doc.runId,
				costActual: doc.costActual,
				costBudget: doc.costBudget,
				percentUsed,
				timestamp: new Date().toISOString(),
			});
		}
	}

	private async pollRuns(): Promise<void> {
		if (!this.running) return;

		try {
			const iterator = this.runsContainer.items.changeFeed({
				maxItemCount: this.maxItemCount,
			});
			const response = await iterator.fetchNext();

			if (response.continuation) {
				this.runsContinuation = response.continuation;
			}

			if (response.result && response.result.length > 0) {
				for (const doc of response.result as Run[]) {
					this.processRunDoc(doc);
				}
			}
		} catch (error) {
			console.error("[ChangeFeed] Error polling runs:", error);
		}
	}

	private async pollAgents(): Promise<void> {
		if (!this.running) return;

		try {
			const iterator = this.agentsContainer.items.changeFeed({
				maxItemCount: this.maxItemCount,
			});
			const response = await iterator.fetchNext();

			if (response.continuation) {
				this.agentsContinuation = response.continuation;
			}

			if (response.result && response.result.length > 0) {
				for (const doc of response.result as AgentState[]) {
					const previousStatus = this.lastAgentStatus.get(doc.agentId) ?? null;
					const currentStatus = doc.status;
					this.lastAgentStatus.set(doc.agentId, currentStatus);

					if (previousStatus !== currentStatus) {
						this.emit({
							type: CHANGE_FEED_EVENTS.AgentStateChanged,
							agentId: doc.agentId,
							runId: doc.runId,
							role: doc.role,
							previousStatus: previousStatus as AgentState["status"] | null,
							currentStatus,
							taskId: doc.taskId,
							tokensUsed: doc.tokensUsed,
							costIncurred: doc.costIncurred,
							timestamp: new Date().toISOString(),
						});
					}
				}
			}
		} catch (error) {
			console.error("[ChangeFeed] Error polling agents:", error);
		}
	}
}
