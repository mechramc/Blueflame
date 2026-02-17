"use client";

import { apiGet } from "@/lib/api-client";
import Link from "next/link";
import { useEffect, useState } from "react";

interface RunSummary {
	runId: string;
	status: string;
	specId: string;
	createdAt: string;
	startedAt: string | null;
	endedAt: string | null;
	costActual: number;
	costBudget: number;
}

interface RunHistoryProps {
	projectId: string;
}

const STATUS_STYLES: Record<string, string> = {
	COMPLETED: "bg-emerald-500/20 text-emerald-400",
	PARTIAL: "bg-amber-500/20 text-amber-400",
	FAILED: "bg-red-500/20 text-red-400",
	EXECUTING: "bg-blue-500/20 text-blue-400",
	PAUSED: "bg-yellow-500/20 text-yellow-400",
	AUTHORIZED: "bg-purple-500/20 text-purple-400",
	PENDING: "bg-gray-500/20 text-gray-400",
};

function formatTime(iso: string | null): string {
	if (!iso) return "—";
	try {
		return new Date(iso).toLocaleString(undefined, {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return iso.slice(0, 16);
	}
}

export function RunHistory({ projectId }: RunHistoryProps) {
	const [runs, setRuns] = useState<RunSummary[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function fetchRuns() {
			try {
				const data = await apiGet<{ runs: RunSummary[] }>(`/api/projects/${projectId}/runs`);
				setRuns(data.runs);
			} catch {
				// API unavailable
			} finally {
				setLoading(false);
			}
		}
		fetchRuns();
		// Re-fetch every 10 seconds to catch status changes
		const interval = setInterval(fetchRuns, 10_000);
		return () => clearInterval(interval);
	}, [projectId]);

	if (loading) {
		return <div className="text-xs text-[--text-muted] animate-pulse p-2">Loading runs...</div>;
	}

	if (runs.length === 0) {
		return (
			<div className="text-xs text-[--text-muted] text-center py-4">
				No runs yet. Generate a plan and start execution.
			</div>
		);
	}

	return (
		<div className="space-y-1.5">
			{runs.map((run) => (
				<Link
					key={run.runId}
					href={`/project/${projectId}/run/${run.runId}`}
					className="block rounded border border-[--border] bg-[--bg-secondary] px-3 py-2 hover:border-[--accent]/50 transition-colors"
				>
					<div className="flex items-center justify-between mb-1">
						<span className="text-[10px] font-mono text-[--text-secondary] truncate max-w-[140px]">
							{run.runId.slice(0, 24)}
						</span>
						<span
							className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
								STATUS_STYLES[run.status] ?? "bg-gray-500/20 text-gray-400"
							}`}
						>
							{run.status}
						</span>
					</div>
					<div className="flex items-center justify-between text-[10px] text-[--text-muted]">
						<span>{formatTime(run.createdAt)}</span>
						{run.costActual > 0 && <span className="font-mono">${run.costActual.toFixed(3)}</span>}
					</div>
				</Link>
			))}
		</div>
	);
}
