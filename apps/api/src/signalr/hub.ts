/**
 * SignalR hub — Socket.IO server integrated with Express.
 *
 * Provides real-time communication between API and web clients.
 * Uses Socket.IO in-memory adapter locally; Azure Web PubSub Socket.IO adapter for production
 * when AZURE_SIGNALR_CONNECTION_STRING is set.
 */

import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

import type {
	ClientToServerEvents,
	InterServerEvents,
	ServerToClientEvents,
	SocketData,
} from "./channels.js";

export type TypedServer = Server<
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData
>;

let io: TypedServer | null = null;

/**
 * Creates and attaches the Socket.IO server to an HTTP server.
 * Call this once after `app.listen()`.
 *
 * When AZURE_SIGNALR_CONNECTION_STRING is set, attaches the Azure Web PubSub
 * Socket.IO adapter for multi-instance message routing in production.
 */
export async function createHub(httpServer: HttpServer): Promise<TypedServer> {
	io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
		httpServer,
		{
			cors: {
				origin: process.env.WEB_URL ?? "http://localhost:3000",
				methods: ["GET", "POST"],
			},
			transports: ["websocket", "polling"],
		},
	);

	// Attach Azure Web PubSub adapter when connection string is available
	const connectionString = process.env.AZURE_SIGNALR_CONNECTION_STRING;
	if (connectionString) {
		try {
			const { useAzureSocketIO } = await import("@azure/web-pubsub-socket.io");
			// Cast to satisfy Azure adapter's generic Server type expectation
			await useAzureSocketIO(io as unknown as Parameters<typeof useAzureSocketIO>[0], {
				hub: "blueflame",
				connectionString,
			});
			console.log("[SignalR] Azure Web PubSub adapter attached");
		} catch (err) {
			console.error("[SignalR] Failed to attach Azure Web PubSub adapter:", err);
			console.log("[SignalR] Falling back to in-memory adapter");
		}
	} else {
		console.log("[SignalR] Using in-memory adapter (local dev)");
	}

	io.on("connection", (socket) => {
		console.log(`[SignalR] Client connected: ${socket.id}`);
		socket.data.subscribedRuns = new Set();

		// ─── Echo channel (test/verification) ────────────
		socket.on("echo:send", (payload) => {
			socket.emit("echo:response", {
				message: payload.message,
				timestamp: new Date().toISOString(),
			});
		});

		// ─── Run subscription (join/leave rooms) ─────────
		socket.on("run:subscribe", (runId) => {
			socket.join(`run:${runId}`);
			socket.data.subscribedRuns.add(runId);
			console.log(`[SignalR] ${socket.id} subscribed to run:${runId}`);
		});

		socket.on("run:unsubscribe", (runId) => {
			socket.leave(`run:${runId}`);
			socket.data.subscribedRuns.delete(runId);
			console.log(`[SignalR] ${socket.id} unsubscribed from run:${runId}`);
		});

		socket.on("disconnect", (reason) => {
			console.log(`[SignalR] Client disconnected: ${socket.id} (${reason})`);
		});
	});

	console.log("[SignalR] Hub initialized");
	return io;
}

/**
 * Returns the active Socket.IO server instance.
 * Throws if called before `createHub()`.
 */
export function getHub(): TypedServer {
	if (!io) {
		throw new Error("SignalR hub not initialized — call createHub() first");
	}
	return io;
}
