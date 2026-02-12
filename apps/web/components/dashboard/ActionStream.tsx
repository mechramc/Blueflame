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
	BUILDER: "text-purple-400",
	VERIFIER: "text-teal-400",
	EXPLAINER: "text-orange-400",
	PLANNER: "text-blue-400",
	FIXER: "text-red-400",
};

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
			<div className="text-[--text-muted] text-sm p-4" data-testid="action-stream-empty">
				No events yet
			</div>
		);
	}

	return (
		<div
			className="border border-[--border] rounded bg-[--bg-primary] text-[--text-primary] p-3 max-h-64 overflow-y-auto font-mono text-xs"
			data-testid="action-stream"
		>
			{events.map((event) => {
				const roleColor = ROLE_COLORS[event.role] ?? "text-[--text-muted]";
				const time = formatTime(event.timestamp);
				return (
					<div key={event.id} className="flex gap-2 py-0.5">
						<span className="text-[--text-muted] shrink-0">{time}</span>
						<span className={`shrink-0 ${roleColor}`}>[{event.role}]</span>
						<span className="text-[--text-primary]">{event.action}</span>
						<span className="text-[--text-muted] truncate">{event.detail}</span>
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
