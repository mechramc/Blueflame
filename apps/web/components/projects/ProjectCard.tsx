"use client";

import type { Project } from "@blueflame/shared";
import Link from "next/link";
import { ProjectStatusBadge } from "./ProjectStatusBadge";

export function ProjectCard({ project }: { project: Project }) {
	return (
		<div className="rounded border border-[--border] bg-[--bg-secondary] p-4 hover:border-[--border-bright] transition-colors group relative overflow-hidden">
			<div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[--accent]" />
			<div className="pl-3">
				<div className="flex items-start justify-between">
					<div className="flex-1 min-w-0">
						<h3 className="text-base font-semibold text-[--text-primary] truncate">
							{project.name}
						</h3>
						{project.description && (
							<p className="mt-1 text-sm text-[--text-secondary] line-clamp-2">
								{project.description}
							</p>
						)}
						<div className="mt-2 flex items-center gap-4 text-xs text-[--text-muted] font-mono">
							<ProjectStatusBadge status={project.status} />
							<span>{project.specCount} specs</span>
							<span>{project.runCount} runs</span>
						</div>
					</div>
				</div>
				<div className="mt-4 flex flex-wrap gap-2">
					<Link
						href={`/project/${project.id}`}
						className="inline-flex items-center gap-1.5 rounded border border-[--accent] bg-[--accent]/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-[--accent]/20 transition-colors"
					>
						Chat + Spec Editor
					</Link>
					<Link
						href={`/project/${project.id}/failures`}
						className="inline-flex items-center gap-1.5 rounded border border-[--border-bright] px-3 py-1.5 text-xs font-medium text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-tertiary] transition-colors"
					>
						Failure Intelligence
					</Link>
				</div>
			</div>
		</div>
	);
}
