/**
 * SignalR client — singleton Socket.IO connection to the API.
 *
 * Provides a typed client that auto-reconnects on disconnect.
 * Import `getSocket()` wherever you need the connection.
 */

import { type Socket, io } from "socket.io-client";

import type { ClientToServerEvents, ServerToClientEvents } from "../../api/src/signalr/channels.js";

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

let socket: TypedSocket | null = null;

/**
 * Returns the singleton Socket.IO client, creating it on first call.
 * Auto-reconnects with exponential backoff.
 */
export function getSocket(): TypedSocket {
	if (!socket) {
		socket = io(API_URL, {
			transports: ["websocket", "polling"],
			autoConnect: true,
			reconnection: true,
			reconnectionAttempts: 10,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 30000,
		}) as TypedSocket;

		socket.on("connect", () => {
			console.log("[SignalR] Connected:", socket?.id);
		});

		socket.on("disconnect", (reason) => {
			console.log("[SignalR] Disconnected:", reason);
		});

		socket.on("connect_error", (err) => {
			console.warn("[SignalR] Connection error:", err.message);
		});
	}

	return socket;
}

/**
 * Disconnects and destroys the singleton socket.
 * Call on app unmount or logout.
 */
export function disconnectSocket(): void {
	if (socket) {
		socket.disconnect();
		socket = null;
	}
}
