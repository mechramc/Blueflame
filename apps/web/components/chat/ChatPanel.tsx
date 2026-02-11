"use client";

import type { ChatMessage } from "@blueflame/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "../../lib/signalr-client";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface ChatPanelProps {
	projectId: string;
}

/**
 * ChatPanel — full chat interface with message history, input, and typing indicator.
 * Left side of the split-view project layout.
 *
 * Wired to:
 * - POST /api/chat — sends user message, triggers Designer agent
 * - GET /api/chat/:projectId — loads conversation history
 * - Socket.IO run:status — receives streaming tokens from Designer agent
 */
export function ChatPanel({ projectId }: ChatPanelProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isTyping, setIsTyping] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);
	const streamBufferRef = useRef("");
	const streamMsgIdRef = useRef<string | null>(null);

	// Auto-scroll to bottom when messages change or typing state changes
	const messageCount = messages.length;
	const typing = isTyping;
	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll must trigger on message count and typing changes
	useEffect(() => {
		const el = scrollRef.current;
		if (el) {
			el.scrollTop = el.scrollHeight;
		}
	}, [messageCount, typing]);

	// Load conversation history on mount
	useEffect(() => {
		async function loadHistory() {
			try {
				const res = await fetch(`${API_BASE}/api/chat/${projectId}`);
				if (res.ok) {
					const data = (await res.json()) as { messages: ChatMessage[] };
					if (data.messages?.length > 0) {
						setMessages(data.messages);
					}
				}
			} catch {
				// API not available — start with empty chat
			}
		}
		loadHistory();
	}, [projectId]);

	// Subscribe to Socket.IO for streaming tokens
	useEffect(() => {
		const socket = getSocket();
		socket.emit("run:subscribe", projectId);

		const handleRunStatus = (payload: { runId: string; status: string }) => {
			if (payload.runId !== projectId) return;

			if (payload.status.startsWith("token:")) {
				const token = payload.status.slice(6);
				streamBufferRef.current += token;

				// Update or create the streaming message
				setMessages((prev) => {
					const msgId = streamMsgIdRef.current;
					if (!msgId) return prev;

					const existing = prev.find((m) => m.id === msgId);
					if (existing) {
						return prev.map((m) =>
							m.id === msgId ? { ...m, content: streamBufferRef.current } : m,
						);
					}
					return [
						...prev,
						{
							id: msgId,
							projectId,
							role: "agent" as const,
							content: streamBufferRef.current,
							createdAt: new Date().toISOString(),
						},
					];
				});
			} else if (payload.status === "complete") {
				setIsTyping(false);
				streamBufferRef.current = "";
				streamMsgIdRef.current = null;
			} else if (payload.status.startsWith("error:")) {
				setIsTyping(false);
				const errorMsg = payload.status.slice(6);
				setMessages((prev) => [
					...prev,
					{
						id: `msg-${Date.now()}-error`,
						projectId,
						role: "agent",
						content: `**Error:** ${errorMsg}`,
						createdAt: new Date().toISOString(),
					},
				]);
				streamBufferRef.current = "";
				streamMsgIdRef.current = null;
			}
		};

		socket.on("run:status", handleRunStatus);

		return () => {
			socket.off("run:status", handleRunStatus);
			socket.emit("run:unsubscribe", projectId);
		};
	}, [projectId]);

	const handleSend = useCallback(
		async (content: string) => {
			const userMessage: ChatMessage = {
				id: `msg-${Date.now()}`,
				projectId,
				role: "user",
				content,
				createdAt: new Date().toISOString(),
			};
			setMessages((prev) => [...prev, userMessage]);
			setIsTyping(true);

			try {
				const res = await fetch(`${API_BASE}/api/chat`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ projectId, message: content }),
				});

				if (res.ok) {
					const data = (await res.json()) as { messageId: string };
					streamMsgIdRef.current = data.messageId;
					streamBufferRef.current = "";
				} else {
					// API returned error — show fallback
					setIsTyping(false);
					setMessages((prev) => [
						...prev,
						{
							id: `msg-${Date.now()}-fallback`,
							projectId,
							role: "agent",
							content:
								"I'm the **Designer agent**. The API is not available right now — please ensure the API server is running on port 4000.",
							createdAt: new Date().toISOString(),
						},
					]);
				}
			} catch {
				// Network error — show offline fallback
				setIsTyping(false);
				setMessages((prev) => [
					...prev,
					{
						id: `msg-${Date.now()}-offline`,
						projectId,
						role: "agent",
						content:
							"I'm the **Designer agent**. I can't reach the API server — please start it with `npm run dev` in `apps/api`.",
						createdAt: new Date().toISOString(),
					},
				]);
			}
		},
		[projectId],
	);

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="border-b border-gray-800 px-4 py-3">
				<h2 className="text-sm font-semibold text-gray-200">Chat</h2>
				<p className="text-xs text-gray-500">Describe what you want to build</p>
			</div>

			{/* Messages */}
			<div ref={scrollRef} className="flex-1 overflow-y-auto py-4">
				{messages.length === 0 && (
					<div className="flex h-full flex-col items-center justify-center gap-2 text-center">
						<div className="rounded-full bg-gray-800 p-4">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								className="h-8 w-8 text-blue-400"
								role="img"
								aria-label="Chat icon"
							>
								<path
									fillRule="evenodd"
									d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.29 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.68-3.348 3.97a48.901 48.901 0 0 1-3.476.383.39.39 0 0 0-.297.17l-2.755 4.133a.75.75 0 0 1-1.248 0l-2.755-4.133a.39.39 0 0 0-.297-.17 48.9 48.9 0 0 1-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97Z"
									clipRule="evenodd"
								/>
							</svg>
						</div>
						<p className="text-sm text-gray-400">
							Start a conversation to begin designing your project
						</p>
					</div>
				)}
				{messages.map((msg) => (
					<MessageBubble key={msg.id} message={msg} />
				))}
				{isTyping && <TypingIndicator />}
			</div>

			{/* Input */}
			<ChatInput onSend={handleSend} disabled={isTyping} />
		</div>
	);
}
