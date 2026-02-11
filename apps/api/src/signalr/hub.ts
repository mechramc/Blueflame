/**
 * SignalR hub — Socket.IO server integrated with Express.
 *
 * Provides real-time communication between API and web clients.
 * Uses Socket.IO locally; upgrade to Azure Web PubSub Socket.IO adapter for production.
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
 */
export function createHub(httpServer: HttpServer): TypedServer {
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
