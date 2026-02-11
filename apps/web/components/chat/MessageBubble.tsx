"use client";

import type { ChatMessage } from "@blueflame/shared";
import Markdown from "react-markdown";

/**
 * MessageBubble — renders a single chat message.
 * User messages are right-aligned; agent messages are left-aligned with markdown.
 */
export function MessageBubble({ message }: { message: ChatMessage }) {
	const isUser = message.role === "user";

	return (
		<div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} px-4 py-1`}>
			<div
				className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
					isUser ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-100"
				} ${message.streaming ? "animate-pulse" : ""}`}
			>
				{isUser ? (
					<p className="whitespace-pre-wrap">{message.content}</p>
				) : (
					<div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-code:rounded prose-code:bg-gray-700 prose-code:px-1 prose-code:py-0.5 prose-pre:bg-gray-900 prose-pre:p-3">
						<Markdown>{message.content}</Markdown>
					</div>
				)}
				<time className={`mt-1 block text-[10px] ${isUser ? "text-blue-200" : "text-gray-500"}`}>
					{new Date(message.createdAt).toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					})}
				</time>
			</div>
		</div>
	);
}
