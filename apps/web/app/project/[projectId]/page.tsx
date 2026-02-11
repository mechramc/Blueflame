"use client";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { useParams } from "next/navigation";

/**
 * Project page — split-view layout with chat (left) and spec/plan panels (right).
 * The right panel will be added in S5-002 (Spec editor UI).
 */
export default function ProjectPage() {
	const params = useParams<{ projectId: string }>();
	const projectId = params.projectId;

	return (
		<div className="flex h-screen">
			{/* Left: Chat panel */}
			<div className="w-1/2 border-r border-gray-800">
				<ChatPanel projectId={projectId} />
			</div>

			{/* Right: Spec/Plan panel (S5-002) */}
			<div className="flex w-1/2 items-center justify-center">
				<div className="text-center">
					<p className="text-sm text-gray-500">Spec and plan panels will appear here</p>
					<p className="text-xs text-gray-600">Coming in S5-002</p>
				</div>
			</div>
		</div>
	);
}
