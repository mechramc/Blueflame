"use client";

import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { useProjects } from "@/hooks/useProjects";
import { useState } from "react";

export default function Home() {
	const { projects, isLoading, error, createProject, deleteProject } = useProjects();
	const [dialogOpen, setDialogOpen] = useState(false);

	return (
		<div className="min-h-[calc(100vh-44px)] p-8">
			<div className="mx-auto max-w-4xl">
				{/* Hero */}
				<div className="mb-10 text-center">
					<h1 className="mb-3 text-5xl font-semibold tracking-[-0.025em] bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
						Blueflame
					</h1>
					<p className="text-base text-[--text-secondary]">The Governed AI Software Refinery</p>
					<p className="mt-2 text-sm text-[--text-muted]">
						Turn human intent into specs, then execute via an authorized multi-agent swarm
					</p>
				</div>

				{/* Projects header */}
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xs font-semibold uppercase text-[--text-muted] tracking-wider">
						Projects
					</h2>
					<button
						type="button"
						onClick={() => setDialogOpen(true)}
						className="inline-flex items-center gap-1.5 rounded border border-[--accent] bg-[--accent]/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-[--accent]/20 transition-colors"
					>
						+ New Project
					</button>
				</div>

				{/* Loading */}
				{isLoading && (
					<div className="text-center py-12">
						<p className="text-sm text-[--text-muted]">Loading projects...</p>
					</div>
				)}

				{/* Error */}
				{error && (
					<div className="rounded border border-red-500/30 bg-red-500/10 p-4 text-center">
						<p className="text-sm text-red-400">{error}</p>
						<p className="mt-1 text-xs text-[--text-muted]">
							Is the API running? Start it with npm run dev in apps/api
						</p>
					</div>
				)}

				{/* Empty state */}
				{!isLoading && !error && projects.length === 0 && (
					<div className="rounded border border-[--border] bg-[--bg-secondary] p-12 text-center">
						<p className="text-sm text-[--text-secondary] mb-3">No projects yet</p>
						<p className="text-xs text-[--text-muted] mb-4">
							Create your first project to start the refinement loop
						</p>
						<button
							type="button"
							onClick={() => setDialogOpen(true)}
							className="inline-flex items-center gap-1.5 rounded border border-[--accent] bg-[--accent]/10 px-4 py-2 text-sm font-medium text-blue-400 hover:bg-[--accent]/20 transition-colors"
						>
							+ New Project
						</button>
					</div>
				)}

				{/* Project list */}
				{!isLoading && projects.length > 0 && (
					<div className="space-y-3">
						{projects.map((project) => (
							<ProjectCard key={project.id} project={project} onDelete={deleteProject} />
						))}
					</div>
				)}

				{/* Architecture highlights */}
				<div className="mt-12 grid grid-cols-3 gap-3">
					<FeatureCard title="Spec-First" icon="S" />
					<FeatureCard title="Governed Agents" icon="G" />
					<FeatureCard title="Failure Intelligence" icon="F" />
				</div>
			</div>

			<CreateProjectDialog
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
				onSubmit={async (name, description) => {
					await createProject(name, description);
				}}
			/>
		</div>
	);
}

function FeatureCard({ title, icon }: { title: string; icon: string }) {
	return (
		<div className="rounded border border-[--border] bg-[--bg-secondary]/50 p-3 flex items-center gap-3">
			<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[--accent]/10 text-xs font-semibold text-blue-400 font-mono">
				{icon}
			</span>
			<span className="text-xs font-medium text-[--text-secondary]">{title}</span>
		</div>
	);
}
