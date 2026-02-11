"use client";

import { useEffect, useRef } from "react";

export interface ActionEvent {
	id: string;
	timestamp: string;
	agentId: string;
	role: string;
	action: string;
	detail: string;
}

interface ActionStreamProps {
	events: ActionEvent[];
}

const ROLE_COLORS: Record<string, string> = {
	BUILDER: "text-purple-600",
	VERIFIER: "text-teal-600",
	EXPLAINER: "text-orange-600",
	PLANNER: "text-blue-600",
};

/**
 * Scrolling log of timestamped agent events.
 * Auto-scrolls to bottom as new events arrive.
 */
export function ActionStream({ events }: ActionStreamProps) {
	const bottomRef = useRef<HTMLDivElement>(null);

	const eventsLength = events.length;
	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new events
	useEffect(() => {
		if (typeof bottomRef.current?.scrollIntoView === "function") {
			bottomRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [eventsLength]);

	if (events.length === 0) {
		return (
			<div className="text-gray-400 text-sm p-4" data-testid="action-stream-empty">
				No events yet
			</div>
		);
	}

	return (
		<div
			className="border rounded bg-gray-900 text-gray-100 p-3 max-h-64 overflow-y-auto font-mono text-xs"
			data-testid="action-stream"
		>
			{events.map((event) => {
				const roleColor = ROLE_COLORS[event.role] ?? "text-gray-400";
				const time = formatTime(event.timestamp);
				return (
					<div key={event.id} className="flex gap-2 py-0.5">
						<span className="text-gray-500 shrink-0">{time}</span>
						<span className={`shrink-0 ${roleColor}`}>[{event.role}]</span>
						<span className="text-gray-300">{event.action}</span>
						<span className="text-gray-500 truncate">{event.detail}</span>
					</div>
				);
			})}
			<div ref={bottomRef} />
		</div>
	);
}

function formatTime(iso: string): string {
	try {
		const d = new Date(iso);
		return d.toLocaleTimeString("en-US", {
			hour12: false,
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	} catch {
		return iso;
	}
}
