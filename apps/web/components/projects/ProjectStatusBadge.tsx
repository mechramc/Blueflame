"use client";

import type { ProjectStatus } from "@blueflame/shared";

const STATUS_STYLES: Record<ProjectStatus, { dot: string; text: string; label: string }> = {
	active: { dot: "bg-[--success]", text: "text-emerald-400", label: "Active" },
	archived: { dot: "bg-[--text-muted]", text: "text-[--text-muted]", label: "Archived" },
	completed: { dot: "bg-blue-400", text: "text-blue-400", label: "Completed" },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
	const style = STATUS_STYLES[status];
	return (
		<span className={`flex items-center gap-1.5 text-xs ${style.text}`}>
			<span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
			{style.label}
		</span>
	);
}
