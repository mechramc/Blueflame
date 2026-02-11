"use client";

import type { SpecStatus } from "@blueflame/shared";

const STATUS_STYLES: Record<string, string> = {
	DRAFT: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
	ACCEPTED: "bg-blue-900/50 text-blue-300 border-blue-700",
	FROZEN: "bg-emerald-900/50 text-emerald-300 border-emerald-700",
};

interface SpecStatusBadgeProps {
	status: SpecStatus;
}

export function SpecStatusBadge({ status }: SpecStatusBadgeProps) {
	const style = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
	return (
		<span
			className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
		>
			{status}
		</span>
	);
}
