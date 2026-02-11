/**
 * useSignalR — React hook for typed Socket.IO channel subscriptions.
 *
 * Usage:
 *   const { isConnected, lastMessage } = useSignalR("echo:response");
 *   const { emit } = useSignalR("echo:response");
 *   emit("echo:send", { message: "hello", timestamp: new Date().toISOString() });
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ClientToServerEvents, ServerToClientEvents } from "../../api/src/signalr/channels.js";
import { type TypedSocket, getSocket } from "../lib/signalr-client.js";

type ServerEvent = keyof ServerToClientEvents;
type ServerEventPayload<E extends ServerEvent> = Parameters<ServerToClientEvents[E]>[0];

interface UseSignalRResult<E extends ServerEvent> {
	/** Whether the socket is currently connected */
	isConnected: boolean;
	/** Most recent payload received on this channel */
	lastMessage: ServerEventPayload<E> | null;
	/** Emit a typed event to the server */
	emit: <K extends keyof ClientToServerEvents>(
		event: K,
		...args: Parameters<ClientToServerEvents[K]>
	) => void;
	/** The raw socket instance */
	socket: TypedSocket;
}

/**
 * Subscribe to a typed SignalR channel event.
 * Manages connection lifecycle and auto-cleanup on unmount.
 */
export function useSignalR<E extends ServerEvent>(event: E): UseSignalRResult<E> {
	const [isConnected, setIsConnected] = useState(false);
	const [lastMessage, setLastMessage] = useState<ServerEventPayload<E> | null>(null);
	const socketRef = useRef<TypedSocket>(getSocket());

	useEffect(() => {
		const socket = socketRef.current;

		const onConnect = () => setIsConnected(true);
		const onDisconnect = () => setIsConnected(false);
		const onMessage = (payload: ServerEventPayload<E>) => setLastMessage(payload);

		socket.on("connect", onConnect);
		socket.on("disconnect", onDisconnect);
		// biome-ignore lint/suspicious/noExplicitAny: Socket.IO event handler typing requires cast
		socket.on(event, onMessage as any);

		// Set initial state
		setIsConnected(socket.connected);

		return () => {
			socket.off("connect", onConnect);
			socket.off("disconnect", onDisconnect);
			// biome-ignore lint/suspicious/noExplicitAny: Socket.IO event handler typing requires cast
			socket.off(event, onMessage as any);
		};
	}, [event]);

	const emit = useCallback(
		<K extends keyof ClientToServerEvents>(
			emitEvent: K,
			...args: Parameters<ClientToServerEvents[K]>
		) => {
			// biome-ignore lint/suspicious/noExplicitAny: Socket.IO emit typing requires cast
			socketRef.current.emit(emitEvent, ...(args as any));
		},
		[],
	);

	return {
		isConnected,
		lastMessage,
		emit,
		socket: socketRef.current,
	};
}
