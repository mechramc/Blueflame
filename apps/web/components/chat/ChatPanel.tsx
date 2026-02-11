"use client";

import type { ChatMessage } from "@blueflame/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

interface ChatPanelProps {
	projectId: string;
}

/**
 * ChatPanel — full chat interface with message history, input, and typing indicator.
 * Left side of the split-view project layout.
 */
export function ChatPanel({ projectId }: ChatPanelProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isTyping, setIsTyping] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);

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

	const handleSend = useCallback(
		(content: string) => {
			const userMessage: ChatMessage = {
				id: `msg-${Date.now()}`,
				projectId,
				role: "user",
				content,
				createdAt: new Date().toISOString(),
			};
			setMessages((prev) => [...prev, userMessage]);

			// TODO: S4-002 will wire this to the Designer agent via API + SignalR
			// For now, show typing indicator briefly and echo a placeholder response
			setIsTyping(true);
			setTimeout(() => {
				const agentMessage: ChatMessage = {
					id: `msg-${Date.now()}-agent`,
					projectId,
					role: "agent",
					content:
						"Thanks for sharing that! I'm the **Designer agent** and I'll help you turn your idea into a detailed specification.\n\n*This is a placeholder response — real agent integration comes in S4-002.*",
					createdAt: new Date().toISOString(),
				};
				setMessages((prev) => [...prev, agentMessage]);
				setIsTyping(false);
			}, 1500);
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
