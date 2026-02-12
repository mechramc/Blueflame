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
			<div className="border-b border-[--border] px-4 py-3">
				<h2 className="text-sm font-semibold text-[--text-primary]">Chat</h2>
				<p className="text-xs text-[--text-muted]">Describe what you want to build</p>
			</div>

			{/* Messages */}
			<div ref={scrollRef} className="flex-1 overflow-y-auto py-4">
				{messages.length === 0 && (
					<div className="flex h-full flex-col items-center justify-center gap-2 text-center px-8">
						<p className="text-sm text-[--text-muted]">
							Start typing to begin designing your project
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
