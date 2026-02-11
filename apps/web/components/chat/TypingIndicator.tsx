"use client";

/**
 * Typing indicator — animated dots shown while the agent is responding.
 */
export function TypingIndicator() {
	return (
		<div className="flex items-center gap-1 px-4 py-2">
			<div className="flex items-center gap-1 rounded-2xl bg-gray-800 px-4 py-3">
				<span className="text-xs text-gray-400">Agent is typing</span>
				<span className="flex gap-0.5">
					<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:0ms]" />
					<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:150ms]" />
					<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:300ms]" />
				</span>
			</div>
		</div>
	);
}
