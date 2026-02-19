"use client";

import { FailureTimeline, type FailureTimelineEntry } from "@/components/failures/FailureTimeline";
import {
	RemediationPlanView,
	type RemediationViewData,
} from "@/components/failures/RemediationPlanView";
import { RootCauseDisplay } from "@/components/failures/RootCauseDisplay";
import type { NormalizedFailure, Remediation, RootCauseAnalysis } from "@blueflame/shared";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Failure Intelligence page — timeline + detail split view.
 *
 * Wired to:
 * - GET /api/failures?projectId=xxx — loads all failures for project
 * - GET /api/remediation?failureId=xxx — loads remediation for a failure
 * - POST /api/remediation/:id/authorize — authorizes remediation plan
 */
export default function FailuresPage() {
	const params = useParams<{ projectId: string }>();
	const projectId = params.projectId;

	const [selectedId, setSelectedId] = useState<string | undefined>();
	const [failures, setFailures] = useState<FailureTimelineEntry[]>([]);
	const [failureMap, setFailureMap] = useState<Map<string, NormalizedFailure>>(new Map());
	const [rootCause, setRootCause] = useState<RootCauseAnalysis | null>(null);
	const [remediation, setRemediation] = useState<RemediationViewData | null>(null);
	const [analyzing, setAnalyzing] = useState(false);

	// Load failures for project on mount
	useEffect(() => {
		async function loadFailures() {
			try {
				const res = await fetch(`${API_BASE}/api/failures?projectId=${projectId}`);
				if (res.ok) {
					const data = (await res.json()) as NormalizedFailure[];
					// Also fetch remediations per-project via run IDs
					const runIds = [...new Set(data.map((f) => f.runId))];
					const allRemediations: Remediation[] = [];
					for (const rid of runIds) {
						try {
							const remRes = await fetch(`${API_BASE}/api/remediation?runId=${rid}`);
							if (remRes.ok) {
								const rems = (await remRes.json()) as Remediation[];
								allRemediations.push(...rems);
							}
						} catch {
							// skip
						}
					}
					const remFailureIds = new Set(allRemediations.map((r) => r.failureId));

					// Store failureId → failure map for runId lookups
					const fMap = new Map<string, NormalizedFailure>();
					for (const f of data) {
						fMap.set(f.failureId, f);
					}
					setFailureMap(fMap);

					const entries: FailureTimelineEntry[] = data.map((f) => ({
						failureId: f.failureId,
						failureType: f.failureType,
						buildNumber: f.buildNumber,
						source: f.source,
						timestamp: f.timestamp,
						branchRef: f.branchRef,
						hasRemediation: remFailureIds.has(f.failureId),
					}));
					setFailures(entries);
				}
			} catch {
				// API not available
			}
		}
		loadFailures();
	}, [projectId]);

	const handleSelect = useCallback(
		async (failureId: string) => {
			setSelectedId(failureId);
			setRootCause(null);
			setRemediation(null);
			setAnalyzing(true);

			try {
				// Fetch existing remediation for this failure
				const remRes = await fetch(`${API_BASE}/api/remediation?failureId=${failureId}`);
				let hasRootCause = false;

				if (remRes.ok) {
					const remediations = (await remRes.json()) as Remediation[];
					if (remediations.length > 0) {
						const rem = remediations[0] as Remediation;
						if (rem.rootCause) {
							hasRootCause = true;
							setRootCause(rem.rootCause);
							setRemediation({
								remediationId: rem.remediationId,
								status: rem.status,
								failureId: rem.failureId,
								parentLockId: rem.parentLockId,
								remediationLockId: rem.remediationLockId,
								createdAt: rem.createdAt,
								updatedAt: rem.updatedAt,
							});
						}
					}
				}

				// If no root cause exists, trigger on-demand analysis
				if (!hasRootCause) {
					const failure = failureMap.get(failureId);
					const runId = failure?.runId ?? "";
					const analyzeRes = await fetch(`${API_BASE}/api/remediation/analyze-failure`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ failureId, runId, projectId }),
					});
					if (analyzeRes.ok) {
						const data = (await analyzeRes.json()) as { remediation: Remediation };
						const rem = data.remediation;
						setRootCause(rem.rootCause);
						setRemediation({
							remediationId: rem.remediationId,
							status: rem.status,
							failureId: rem.failureId,
							parentLockId: rem.parentLockId,
							remediationLockId: rem.remediationLockId,
							createdAt: rem.createdAt,
							updatedAt: rem.updatedAt,
						});
					}
				}
			} catch {
				// API not available
			} finally {
				setAnalyzing(false);
			}
		},
		[failureMap, projectId],
	);

	const handleAuthorize = useCallback(async () => {
		if (!remediation) return;
		try {
			const res = await fetch(
				`${API_BASE}/api/remediation/${remediation.remediationId}/authorize`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ lockId: `lock-rem-${Date.now()}` }),
				},
			);
			if (res.ok) {
				const updated = (await res.json()) as Remediation;
				setRemediation({
					remediationId: updated.remediationId,
					status: updated.status,
					failureId: updated.failureId,
					parentLockId: updated.parentLockId,
					remediationLockId: updated.remediationLockId,
					createdAt: updated.createdAt,
					updatedAt: updated.updatedAt,
				});
			}
		} catch {
			// API error
		}
	}, [remediation]);

	const handleExecute = useCallback(async () => {
		if (!remediation) return;
		try {
			const res = await fetch(`${API_BASE}/api/remediation/${remediation.remediationId}/execute`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});
			if (res.ok) {
				const updated = (await res.json()) as Remediation;
				setRemediation({
					remediationId: updated.remediationId,
					status: updated.status,
					failureId: updated.failureId,
					parentLockId: updated.parentLockId,
					remediationLockId: updated.remediationLockId,
					createdAt: updated.createdAt,
					updatedAt: updated.updatedAt,
				});
			}
		} catch {
			// API error
		}
	}, [remediation]);

	return (
		<div className="h-[calc(100vh-44px)] flex flex-col">
			{/* Header */}
			<div className="border-b border-[--border] px-6 py-3 bg-[--bg-primary]">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-lg font-semibold text-[--text-primary]">Failure Intelligence</h1>
						<p className="text-xs text-[--text-muted]">
							CI/CD failures, root cause analysis, and governed remediation for project{" "}
							<span className="font-mono">{projectId}</span>
						</p>
					</div>
					{/* MS Service badges */}
					<div className="flex items-center gap-3">
						<span className="inline-flex items-center gap-1.5 rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] font-medium text-blue-400">
							<span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
							Azure OpenAI — Root Cause Analysis
						</span>
						<span className="inline-flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-400">
							<span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
							Azure Cosmos DB — Failure Persistence
						</span>
						<span className="inline-flex items-center gap-1.5 rounded border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[10px] font-medium text-purple-400">
							<span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
							Microsoft Entra ID — Governance Gate
						</span>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 flex overflow-hidden">
				{/* Timeline (left) */}
				<div className="w-80 border-r border-[--border] overflow-y-auto bg-[--bg-primary]">
					<FailureTimeline failures={failures} onSelect={handleSelect} selectedId={selectedId} />
				</div>

				{/* Detail (right) */}
				<div className="flex-1 overflow-y-auto p-6 bg-[--bg-secondary]">
					{selectedId ? (
						<div className="max-w-2xl space-y-6">
							{analyzing ? (
								<div className="flex items-center gap-2 text-sm text-[--accent] animate-pulse py-8">
									<span className="w-2 h-2 rounded-full bg-[--accent]" />
									Azure OpenAI Fixer Agent analyzing failure...
								</div>
							) : (
								<>
									{/* Root Cause Analysis section */}
									<div>
										<div className="flex items-center gap-2 mb-3">
											<h3 className="text-sm font-semibold text-[--text-primary]">
												Root Cause Analysis
											</h3>
											{rootCause && (
												<span className="text-[10px] rounded bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.5 text-blue-400 font-medium">
													via Azure OpenAI (gpt-4o-mini)
												</span>
											)}
										</div>
										<RootCauseDisplay rootCause={rootCause} />
									</div>

									{/* Remediation section */}
									<div className="border-t border-[--border] pt-4">
										<div className="flex items-center gap-2 mb-3">
											<h3 className="text-sm font-semibold text-[--text-primary]">
												Governed Remediation
											</h3>
											{remediation && (
												<span className="text-[10px] rounded bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 text-emerald-400 font-medium">
													persisted to Azure Cosmos DB
												</span>
											)}
										</div>
										<RemediationPlanView
											remediation={remediation}
											onAuthorize={handleAuthorize}
											onExecute={handleExecute}
										/>
									</div>
								</>
							)}
						</div>
					) : (
						<div className="flex flex-col items-center justify-center h-full gap-3">
							<div className="text-sm text-[--text-muted]">
								Select a failure from the timeline to view details
							</div>
							<div className="flex items-center gap-2 text-[10px] text-[--text-muted]">
								<span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
								Root cause powered by Azure OpenAI Fixer Agent
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
