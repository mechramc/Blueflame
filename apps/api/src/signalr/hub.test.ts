import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { type Socket as ClientSocket, io as ioClient } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ClientToServerEvents, ServerToClientEvents } from "./channels.js";
import { type TypedServer, createHub, getHub } from "./hub.js";

type TypedClientSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

describe("SignalR Hub", () => {
	let httpServer: ReturnType<typeof createServer>;
	let ioServer: TypedServer;
	let clientSocket: TypedClientSocket;
	let port: number;

	beforeAll(
		() =>
			new Promise<void>((resolve, reject) => {
				httpServer = createServer();
				httpServer.listen(0, async () => {
					try {
						port = (httpServer.address() as AddressInfo).port;
						ioServer = await createHub(httpServer);
						clientSocket = ioClient(`http://localhost:${port}`, {
							transports: ["websocket"],
						}) as TypedClientSocket;
						clientSocket.on("connect", () => resolve());
					} catch (err) {
						reject(err);
					}
				});
			}),
	);

	afterAll(
		() =>
			new Promise<void>((resolve) => {
				clientSocket.disconnect();
				ioServer.close(() => {
					httpServer.close(() => resolve());
				});
			}),
	);

	it("should connect a client via WebSocket", () => {
		expect(clientSocket.connected).toBe(true);
	});

	it("should echo messages back on echo:send", () =>
		new Promise<void>((resolve) => {
			clientSocket.on("echo:response", (payload) => {
				expect(payload.message).toBe("hello world");
				expect(payload.timestamp).toBeDefined();
				resolve();
			});
			clientSocket.emit("echo:send", {
				message: "hello world",
				timestamp: new Date().toISOString(),
			});
		}));

	it("should return the hub instance via getHub()", () => {
		const hub = getHub();
		expect(hub).toBe(ioServer);
	});

	it("should allow subscribing to a run room", () =>
		new Promise<void>((resolve) => {
			clientSocket.emit("run:subscribe", "test-run-123");
			// Give the server time to process the room join
			setTimeout(() => {
				const rooms = ioServer.sockets.adapter.rooms.get("run:test-run-123");
				expect(rooms).toBeDefined();
				const socketId = clientSocket.id ?? "";
				expect(rooms?.has(socketId)).toBe(true);
				resolve();
			}, 100);
		}));

	it("should allow unsubscribing from a run room", () =>
		new Promise<void>((resolve) => {
			clientSocket.emit("run:subscribe", "test-run-456");
			setTimeout(() => {
				clientSocket.emit("run:unsubscribe", "test-run-456");
				setTimeout(() => {
					const rooms = ioServer.sockets.adapter.rooms.get("run:test-run-456");
					const socketId = clientSocket.id ?? "";
					// Room either doesn't exist or doesn't contain the client
					expect(!rooms || !rooms.has(socketId)).toBe(true);
					resolve();
				}, 100);
			}, 100);
		}));
});
