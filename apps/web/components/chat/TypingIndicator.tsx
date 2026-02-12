"use client";

/**
 * Typing indicator — minimal dots shown while the agent is responding.
 */
export function TypingIndicator() {
	return (
		<div className="flex items-center gap-2 px-4 py-2">
			<div className="border-l-2 border-[--accent] pl-3 flex items-center gap-2">
				<span className="text-[10px] text-[--text-muted]">Designer is typing</span>
				<span className="flex gap-0.5">
					<span className="h-1 w-1 animate-bounce rounded-full bg-[--accent] [animation-delay:0ms]" />
					<span className="h-1 w-1 animate-bounce rounded-full bg-[--accent] [animation-delay:150ms]" />
					<span className="h-1 w-1 animate-bounce rounded-full bg-[--accent] [animation-delay:300ms]" />
				</span>
			</div>
		</div>
	);
}
