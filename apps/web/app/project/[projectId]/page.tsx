"use client";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { SplitView } from "@/components/layout/SplitView";
import { SpecEditor } from "@/components/spec/SpecEditor";
import { useParams } from "next/navigation";

/**
 * Project page — resizable split-view with chat (left) and spec editor (right).
 * Both panels are self-wired to the API.
 */
export default function ProjectPage() {
	const params = useParams<{ projectId: string }>();
	const projectId = params.projectId;

	return (
		<div className="h-[calc(100vh-44px)]">
			<SplitView
				left={<ChatPanel projectId={projectId} />}
				right={<SpecEditor projectId={projectId} />}
				defaultLeftPercent={40}
				minWidth={350}
			/>
		</div>
	);
}
