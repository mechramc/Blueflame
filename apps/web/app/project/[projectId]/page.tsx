"use client";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { SplitView } from "@/components/layout/SplitView";
import { SpecEditor } from "@/components/spec/SpecEditor";
import { useParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Project page — resizable split-view with chat (left) and spec editor (right).
 */
export default function ProjectPage() {
	const params = useParams<{ projectId: string }>();
	const projectId = params.projectId;

	const handleGenerateSpec = useCallback(() => {
		// TODO: S5-002 will wire this to the spec generation API
		console.log("[ProjectPage] Generate spec requested for", projectId);
	}, [projectId]);

	return (
		<div className="h-screen">
			<SplitView
				left={<ChatPanel projectId={projectId} />}
				right={<SpecEditor projectId={projectId} onGenerateSpec={handleGenerateSpec} />}
				defaultLeftPercent={40}
				minWidth={350}
			/>
		</div>
	);
}
