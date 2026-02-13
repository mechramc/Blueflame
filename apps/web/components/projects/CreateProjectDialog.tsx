"use client";

import { type FormEvent, useState } from "react";

interface CreateProjectDialogProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (name: string, description: string) => Promise<void>;
}

export function CreateProjectDialog({ open, onClose, onSubmit }: CreateProjectDialogProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!open) return null;

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;

		setSubmitting(true);
		setError(null);
		try {
			await onSubmit(name.trim(), description.trim());
			setName("");
			setDescription("");
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create project");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div className="absolute inset-0 bg-black/60" onClick={onClose} onKeyDown={undefined} />
			{/* Dialog */}
			<div className="relative z-10 w-full max-w-md rounded-lg border border-[--border-bright] bg-[--bg-secondary] p-6 shadow-xl">
				<h2 className="text-lg font-semibold text-[--text-primary] mb-4">New Project</h2>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label htmlFor="project-name" className="block text-xs font-medium text-[--text-secondary] mb-1">
							Project Name
						</label>
						<input
							id="project-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g., Backend Refactor v3"
							className="w-full rounded border border-[--border] bg-[--bg-primary] px-3 py-2 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:border-[--accent] focus:outline-none"
							autoFocus
							required
						/>
					</div>
					<div>
						<label htmlFor="project-desc" className="block text-xs font-medium text-[--text-secondary] mb-1">
							Description
						</label>
						<textarea
							id="project-desc"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="What is this project about?"
							rows={3}
							className="w-full rounded border border-[--border] bg-[--bg-primary] px-3 py-2 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:border-[--accent] focus:outline-none resize-none"
						/>
					</div>
					{error && <p className="text-xs text-red-400">{error}</p>}
					<div className="flex justify-end gap-2 pt-2">
						<button
							type="button"
							onClick={onClose}
							className="rounded px-3 py-1.5 text-sm text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-tertiary] transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={submitting || !name.trim()}
							className="rounded border border-[--accent] bg-[--accent]/10 px-3 py-1.5 text-sm font-medium text-blue-400 hover:bg-[--accent]/20 transition-colors disabled:opacity-50"
						>
							{submitting ? "Creating..." : "Create Project"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
