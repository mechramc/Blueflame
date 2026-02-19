"use client";

import { type KeyboardEvent, useCallback, useRef, useState } from "react";

interface ChatInputProps {
	onSend: (content: string) => void;
	disabled?: boolean;
}

/**
 * ChatInput — full-width bottom bar with frosted glass effect.
 * Enter sends, Shift+Enter adds newline.
 * Supports file attachment (PRD/RFC upload) via paperclip button.
 */
export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
	const [value, setValue] = useState("");
	const [attachment, setAttachment] = useState<{ name: string; content: string } | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleSend = useCallback(() => {
		const trimmed = value.trim();
		if ((!trimmed && !attachment) || disabled) return;

		let message = trimmed;
		if (attachment) {
			message = `[PRD: ${attachment.name}]\n\n${attachment.content}\n\n${trimmed || "Please analyze this PRD and generate a structured Output Spec."}`;
		}

		onSend(message);
		setValue("");
		setAttachment(null);
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
		}
	}, [value, attachment, disabled, onSend]);

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

	const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = () => {
			const text = reader.result as string;
			setAttachment({ name: file.name, content: text });
		};
		reader.readAsText(file);

		// Reset input so same file can be re-selected
		e.target.value = "";
	}, []);

	return (
		<div className="border-t border-[--border] bg-[--bg-primary]/80 backdrop-blur-xl px-4 py-3">
			{/* Attachment badge */}
			{attachment && (
				<div className="flex items-center gap-2 mb-2 px-1">
					<span className="inline-flex items-center gap-1.5 rounded border border-[--accent]/30 bg-[--accent]/10 px-2 py-1 text-[10px] font-medium text-blue-400">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							className="h-3 w-3"
							role="img"
							aria-label="File"
						>
							<path
								fillRule="evenodd"
								d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
								clipRule="evenodd"
							/>
						</svg>
						{attachment.name}
					</span>
					<button
						type="button"
						onClick={() => setAttachment(null)}
						className="text-[--text-muted] hover:text-red-400 text-xs"
						aria-label="Remove attachment"
					>
						&times;
					</button>
				</div>
			)}
			<div className="flex items-end gap-2">
				{/* Hidden file input */}
				<input
					ref={fileInputRef}
					type="file"
					accept=".txt,.md,.markdown"
					onChange={handleFileSelect}
					className="hidden"
					data-testid="chat-file-input"
				/>
				{/* Paperclip button */}
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					disabled={disabled}
					className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-[--border] text-[--text-muted] transition-colors hover:text-[--text-primary] hover:bg-[--bg-tertiary] disabled:opacity-50"
					aria-label="Attach file"
					data-testid="chat-attach-button"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						className="h-4 w-4"
						role="img"
						aria-label="Attach"
					>
						<path
							fillRule="evenodd"
							d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z"
							clipRule="evenodd"
						/>
					</svg>
				</button>
				<textarea
					ref={textareaRef}
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={handleKeyDown}
					onInput={handleInput}
					placeholder={
						attachment ? "Add instructions (optional)..." : "Describe what you want to build..."
					}
					disabled={disabled}
					rows={1}
					data-testid="chat-input-textarea"
					className="flex-1 resize-none rounded border border-[--border] bg-[--bg-secondary] px-3 py-2 text-sm text-[--text-primary] placeholder-[--text-muted] focus:border-[--accent] focus:outline-none focus:ring-1 focus:ring-[--accent-glow] disabled:opacity-50 font-sans"
				/>
				<button
					onClick={handleSend}
					disabled={disabled || (!value.trim() && !attachment)}
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
