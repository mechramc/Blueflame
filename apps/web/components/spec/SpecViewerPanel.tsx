"use client";

import { useEffect, useState } from "react";

import { apiGet } from "@/lib/api-client";
import type { OutputSpec } from "@blueflame/shared";

interface SpecViewerPanelProps {
	projectId: string;
}

interface SpecApiResponse {
	spec: OutputSpec;
}

/**
 * Read-only spec viewer panel for the run dashboard.
 * Displays frozen YAML content with SCR guidance.
 */
export function SpecViewerPanel({ projectId }: SpecViewerPanelProps) {
	const [spec, setSpec] = useState<OutputSpec | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function fetchSpec() {
			try {
				const data = await apiGet<SpecApiResponse>(`/api/specs/${projectId}`);
				if (!cancelled) {
					setSpec(data.spec);
					setLoading(false);
				}
			} catch (err) {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : "Failed to load spec");
					setLoading(false);
				}
			}
		}

		fetchSpec();
		return () => {
			cancelled = true;
		};
	}, [projectId]);

	if (loading) {
		return (
			<div className="border-b border-[--border] bg-[--bg-secondary] px-4 py-3">
				<p className="text-xs text-[--text-secondary]">Loading spec...</p>
			</div>
		);
	}

	if (error || !spec) {
		return (
			<div className="border-b border-[--border] bg-[--bg-secondary] px-4 py-3">
				<p className="text-xs text-red-400">{error ?? "Spec not found"}</p>
			</div>
		);
	}

	return (
		<div className="border-b border-[--border] bg-[--bg-secondary]">
			{/* Header with metadata */}
			<div className="flex items-center justify-between px-4 py-2 border-b border-[--border]">
				<div className="flex items-center gap-2">
					<span className="text-xs font-medium text-[--text-primary]">{spec.title}</span>
					<span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">
						{spec.status}
					</span>
					<span className="text-xs text-[--text-secondary] font-mono">
						{spec.specId.slice(0, 12)}
					</span>
				</div>
				<a
					href={`/project/${projectId}`}
					className="text-xs text-[--accent] hover:underline"
				>
					Go to Project
				</a>
			</div>

			{/* SCR guidance banner */}
			<div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2">
				<p className="text-xs text-amber-400">
					This spec is frozen. To make changes, use a{" "}
					<a
						href={`/project/${projectId}`}
						className="font-medium underline hover:text-amber-300"
					>
						Spec Change Request
					</a>{" "}
					from the project page.
				</p>
			</div>

			{/* YAML content */}
			<div className="max-h-64 overflow-auto px-4 py-3">
				<pre className="text-xs text-[--text-secondary] font-mono whitespace-pre-wrap break-words leading-relaxed">
					{spec.content}
				</pre>
			</div>
		</div>
	);
}
