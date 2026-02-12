"use client";

import type { ChatMessage } from "@blueflame/shared";
import Markdown from "react-markdown";

/**
 * MessageRow — renders a single chat message in a Linear-style full-width row.
 * Agent messages have a blue left border; user messages are right-aligned with subtle dimming.
 */
export function MessageBubble({ message }: { message: ChatMessage }) {
	const isUser = message.role === "user";

	return (
		<div className={`flex w-full px-4 py-1.5 ${isUser ? "justify-end" : ""}`}>
			{!isUser && (
				<div className="w-full border-l-2 border-[--accent] pl-3">
					<div className="flex items-center gap-2 mb-1">
						<span className="text-[10px] font-medium text-[--accent] uppercase tracking-wider">
							Designer
						</span>
						<time className="text-[10px] font-mono text-[--text-muted]">
							{new Date(message.createdAt).toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
							})}
						</time>
					</div>
					<div
						className={`prose prose-invert prose-sm max-w-none text-sm leading-relaxed text-[--text-primary] prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-code:rounded prose-code:bg-[--bg-tertiary] prose-code:px-1 prose-code:py-0.5 prose-pre:bg-[--bg-primary] prose-pre:p-3 prose-pre:border prose-pre:border-[--border] ${message.streaming ? "animate-pulse" : ""}`}
					>
						<Markdown>{message.content}</Markdown>
					</div>
				</div>
			)}
			{isUser && (
				<div className="max-w-[80%]">
					<div className="flex items-center justify-end gap-2 mb-1">
						<time className="text-[10px] font-mono text-[--text-muted]">
							{new Date(message.createdAt).toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
							})}
						</time>
						<span className="text-[10px] font-medium text-[--text-muted] uppercase tracking-wider">
							You
						</span>
					</div>
					<p className="whitespace-pre-wrap text-sm leading-relaxed text-[--text-secondary]">
						{message.content}
					</p>
				</div>
			)}
		</div>
	);
}
