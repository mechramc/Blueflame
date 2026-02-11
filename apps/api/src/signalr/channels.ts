/**
 * SignalR channel definitions — typed events for server ↔ client communication.
 *
 * Uses Socket.IO for local dev; Azure Web PubSub Socket.IO adapter for production.
 * All channel events are strongly typed via ServerToClientEvents / ClientToServerEvents.
 */

// ─── Event Payloads ──────────────────────────────────────────

export interface EchoPayload {
	message: string;
	timestamp: string;
}

export interface RunStatusPayload {
	runId: string;
	status: string;
	updatedAt: string;
}

export interface AgentStatePayload {
	runId: string;
	agentId: string;
	role: string;
	status: string;
	updatedAt: string;
}

export interface BudgetAlertPayload {
	runId: string;
	currentSpend: number;
	ceiling: number;
	percentUsed: number;
}

// ─── Typed Event Maps ────────────────────────────────────────

/** Events the server can emit to clients */
export interface ServerToClientEvents {
	"echo:response": (payload: EchoPayload) => void;
	"run:status": (payload: RunStatusPayload) => void;
	"agent:state": (payload: AgentStatePayload) => void;
	"budget:alert": (payload: BudgetAlertPayload) => void;
}

/** Events clients can emit to the server */
export interface ClientToServerEvents {
	"echo:send": (payload: EchoPayload) => void;
	"run:subscribe": (runId: string) => void;
	"run:unsubscribe": (runId: string) => void;
}

/** Inter-server events (unused for now) */
export interface InterServerEvents {
	ping: () => void;
}

/** Per-socket data */
export interface SocketData {
	userId?: string;
	subscribedRuns: Set<string>;
}
