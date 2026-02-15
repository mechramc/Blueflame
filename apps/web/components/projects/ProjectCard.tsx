"use client";

import type { Project } from "@blueflame/shared";
import Link from "next/link";
import { useState } from "react";
import { ProjectStatusBadge } from "./ProjectStatusBadge";

interface ProjectCardProps {
	project: Project;
	onDelete?: (projectId: string) => Promise<void>;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [deleting, setDeleting] = useState(false);

	async function handleDelete() {
		if (!onDelete) return;
		setDeleting(true);
		try {
			await onDelete(project.id);
		} catch {
			setDeleting(false);
			setConfirmDelete(false);
		}
	}

	return (
		<div
			data-testid={`project-card-${project.id}`}
			className="rounded border border-[--border] bg-[--bg-secondary] p-4 hover:border-[--border-bright] transition-colors group relative overflow-hidden"
		>
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
				<div className="mt-4 flex flex-wrap items-center gap-2">
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

					{onDelete && (
						<div className="ml-auto">
							{confirmDelete ? (
								<span className="inline-flex items-center gap-1.5">
									<span className="text-xs text-red-400">Delete?</span>
									<button
										type="button"
										disabled={deleting}
										onClick={handleDelete}
										className="rounded border border-red-500/50 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
									>
										{deleting ? "Deleting..." : "Yes"}
									</button>
									<button
										type="button"
										onClick={() => setConfirmDelete(false)}
										className="rounded border border-[--border-bright] px-2 py-1 text-xs font-medium text-[--text-secondary] hover:bg-[--bg-tertiary] transition-colors"
									>
										No
									</button>
								</span>
							) : (
								<button
									type="button"
									onClick={() => setConfirmDelete(true)}
									className="rounded border border-[--border] px-2 py-1 text-xs font-medium text-[--text-muted] hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
								>
									Delete
								</button>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
