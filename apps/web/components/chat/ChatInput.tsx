"use client";

import { type KeyboardEvent, useCallback, useRef, useState } from "react";

interface ChatInputProps {
	onSend: (content: string) => void;
	disabled?: boolean;
}

/**
 * ChatInput — text area with send button.
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
		// Reset textarea height
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
		<div className="border-t border-gray-800 bg-gray-950 px-4 py-3">
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
					className="flex-1 resize-none rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
				/>
				<button
					onClick={handleSend}
					disabled={disabled || !value.trim()}
					type="button"
					className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600"
					aria-label="Send message"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="currentColor"
						className="h-5 w-5"
						role="img"
						aria-label="Send"
					>
						<path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
					</svg>
				</button>
			</div>
			<p className="mt-1 text-[10px] text-gray-600">
				Press Enter to send, Shift+Enter for new line
			</p>
		</div>
	);
}
