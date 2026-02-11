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
 * - GET /api/failures/:failureId — loads failure detail
 * - GET /api/remediation?failureId=xxx — loads remediation for a failure
 * - POST /api/remediation/:id/authorize — authorizes remediation plan
 */
export default function FailuresPage() {
	const params = useParams<{ projectId: string }>();
	const projectId = params.projectId;

	const [selectedId, setSelectedId] = useState<string | undefined>();
	const [failures, setFailures] = useState<FailureTimelineEntry[]>([]);
	const [rootCause, setRootCause] = useState<RootCauseAnalysis | null>(null);
	const [remediation, setRemediation] = useState<RemediationViewData | null>(null);

	// Load failures for project on mount
	useEffect(() => {
		async function loadFailures() {
			try {
				const res = await fetch(`${API_BASE}/api/failures?projectId=${projectId}`);
				if (res.ok) {
					const data = (await res.json()) as NormalizedFailure[];
					// Also fetch remediations to check which failures have them
					const remRes = await fetch(`${API_BASE}/api/remediation?runId=demo-run-1`);
					const remediations: Remediation[] = remRes.ok
						? ((await remRes.json()) as Remediation[])
						: [];
					const remFailureIds = new Set(remediations.map((r) => r.failureId));

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

	const handleSelect = useCallback(async (failureId: string) => {
		setSelectedId(failureId);
		setRootCause(null);
		setRemediation(null);

		try {
			// Fetch remediation for this failure
			const remRes = await fetch(`${API_BASE}/api/remediation?failureId=${failureId}`);
			if (remRes.ok) {
				const remediations = (await remRes.json()) as Remediation[];
				if (remediations.length > 0) {
					const rem = remediations[0] as Remediation;
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
		}
	}, []);

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

	return (
		<div className="h-[calc(100vh-44px)] flex flex-col">
			{/* Header */}
			<div className="border-b border-gray-800 px-6 py-3 bg-gray-950">
				<h1 className="text-lg font-semibold text-gray-100">Failure Intelligence</h1>
				<p className="text-xs text-gray-500">
					CI/CD failures, root cause analysis, and governed remediation for project{" "}
					<span className="font-mono">{projectId}</span>
				</p>
			</div>

			{/* Content */}
			<div className="flex-1 flex overflow-hidden">
				{/* Timeline (left) */}
				<div className="w-80 border-r border-gray-800 overflow-y-auto bg-gray-950">
					<FailureTimeline failures={failures} onSelect={handleSelect} selectedId={selectedId} />
				</div>

				{/* Detail (right) */}
				<div className="flex-1 overflow-y-auto p-6 bg-gray-900">
					{selectedId ? (
						<div className="max-w-2xl space-y-6">
							<RootCauseDisplay rootCause={rootCause} />
							<div className="border-t border-gray-700 pt-4">
								<RemediationPlanView remediation={remediation} onAuthorize={handleAuthorize} />
							</div>
						</div>
					) : (
						<div className="flex items-center justify-center h-full text-sm text-gray-500">
							Select a failure from the timeline to view details
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
