"use client";

import { type KeyboardEvent, useCallback, useRef, useState } from "react";

interface ChatInputProps {
	onSend: (content: string) => void;
	disabled?: boolean;
}

/**
 * ChatInput — full-width bottom bar with frosted glass effect.
 * Enter sends, Shift+Enter adds newline.
 */
export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
	const [value, setValue] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const handleSend = useCallback(() => {
		const trimmed = value.trim();
		if (!trimmed || disabled) return;
		onSend(trimmed);
		setValue("");
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
		}
	}, [value, disabled, onSend]);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSend();
			}
		},
		[handleSend],
	);

	const handleInput = useCallback(() => {
		const el = textareaRef.current;
		if (el) {
			el.style.height = "auto";
			el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
		}
	}, []);

	return (
		<div className="border-t border-[--border] bg-[--bg-primary]/80 backdrop-blur-xl px-4 py-3">
			<div className="flex items-end gap-2">
				<textarea
					ref={textareaRef}
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={handleKeyDown}
					onInput={handleInput}
					placeholder="Describe what you want to build..."
					disabled={disabled}
					rows={1}
					data-testid="chat-input-textarea"
					className="flex-1 resize-none rounded border border-[--border] bg-[--bg-secondary] px-3 py-2 text-sm text-[--text-primary] placeholder-[--text-muted] focus:border-[--accent] focus:outline-none focus:ring-1 focus:ring-[--accent-glow] disabled:opacity-50 font-sans"
				/>
				<button
					onClick={handleSend}
					disabled={disabled || !value.trim()}
					type="button"
					className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[--accent] text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
					aria-label="Send message"
					data-testid="chat-input-send-button"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="currentColor"
						className="h-4 w-4"
						role="img"
						aria-label="Send"
					>
						<path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
					</svg>
				</button>
			</div>
			<p className="mt-1 text-[10px] text-[--text-muted]">
				Enter to send, Shift+Enter for new line
			</p>
		</div>
	);
}
