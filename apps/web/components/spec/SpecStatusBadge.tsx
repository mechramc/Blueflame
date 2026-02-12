"use client";

import type { SpecStatus } from "@blueflame/shared";

const STATUS_DOT: Record<string, string> = {
	DRAFT: "bg-yellow-400",
	ACCEPTED: "bg-blue-400",
	FROZEN: "bg-emerald-400",
};

const STATUS_TEXT: Record<string, string> = {
	DRAFT: "text-yellow-400",
	ACCEPTED: "text-blue-400",
	FROZEN: "text-emerald-400",
};

interface SpecStatusBadgeProps {
	status: SpecStatus;
}

export function SpecStatusBadge({ status }: SpecStatusBadgeProps) {
	const dot = STATUS_DOT[status] ?? "bg-[--text-muted]";
	const text = STATUS_TEXT[status] ?? "text-[--text-muted]";
	return (
		<span className={`inline-flex items-center gap-1.5 text-xs font-medium ${text}`}>
			<span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
			{status}
		</span>
	);
}
