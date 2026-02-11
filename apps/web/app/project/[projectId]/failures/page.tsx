"use client";

import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import {
	FailureTimeline,
	type FailureTimelineEntry,
} from "@/components/failures/FailureTimeline";
import { RootCauseDisplay } from "@/components/failures/RootCauseDisplay";
import {
	RemediationPlanView,
	type RemediationViewData,
} from "@/components/failures/RemediationPlanView";
import type { RootCauseAnalysis } from "@blueflame/shared";

/**
 * Failure Intelligence page — timeline + detail split view.
 *
 * Left: chronological failure timeline
 * Right: selected failure detail with root cause and remediation state
 */
export default function FailuresPage() {
	const params = useParams<{ projectId: string }>();
	const projectId = params.projectId;

	const [selectedId, setSelectedId] = useState<string | undefined>();
	const [failures] = useState<FailureTimelineEntry[]>([]);
	const [rootCause] = useState<RootCauseAnalysis | null>(null);
	const [remediation] = useState<RemediationViewData | null>(null);

	const handleSelect = useCallback((failureId: string) => {
		setSelectedId(failureId);
		// TODO: fetch failure detail, root cause, and remediation from API
	}, []);

	const handleAuthorize = useCallback(() => {
		// TODO: call POST /api/remediation/:id/authorize
		console.log("[FailuresPage] Authorize remediation for", projectId);
	}, [projectId]);

	return (
		<div className="h-screen flex flex-col">
			{/* Header */}
			<div className="border-b px-6 py-3 bg-white">
				<h1 className="text-lg font-semibold text-gray-900">Failure Intelligence</h1>
				<p className="text-xs text-gray-500">
					CI/CD failures, root cause analysis, and governed remediation for project{" "}
					<span className="font-mono">{projectId}</span>
				</p>
			</div>

			{/* Content */}
			<div className="flex-1 flex overflow-hidden">
				{/* Timeline (left) */}
				<div className="w-80 border-r overflow-y-auto bg-white">
					<FailureTimeline
						failures={failures}
						onSelect={handleSelect}
						selectedId={selectedId}
					/>
				</div>

				{/* Detail (right) */}
				<div className="flex-1 overflow-y-auto p-6 bg-gray-50">
					{selectedId ? (
						<div className="max-w-2xl space-y-6">
							<RootCauseDisplay rootCause={rootCause} />
							<div className="border-t pt-4">
								<RemediationPlanView
									remediation={remediation}
									onAuthorize={handleAuthorize}
								/>
							</div>
						</div>
					) : (
						<div className="flex items-center justify-center h-full text-sm text-gray-400">
							Select a failure from the timeline to view details
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
