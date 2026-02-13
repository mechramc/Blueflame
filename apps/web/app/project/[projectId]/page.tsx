"use client";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { SpecEditor } from "@/components/spec/SpecEditor";
import { ValidationPanel } from "@/components/spec/ValidationPanel";
import { SpecStatus } from "@blueflame/shared";
import { useParams } from "next/navigation";
import { useState } from "react";

/**
 * Project page — 3-panel layout: Chat | Spec Editor | Validation.
 */
export default function ProjectPage() {
	const params = useParams<{ projectId: string }>();
	const projectId = params.projectId;

	// Shared state from SpecEditor for the validation panel
	const [specId, setSpecId] = useState<string | null>(null);
	const [specContent, setSpecContent] = useState("");
	const [specStatus, setSpecStatus] = useState<SpecStatus>(SpecStatus.Draft);

	return (
		<div className="h-[calc(100vh-44px)] flex">
			{/* Chat Panel — 35% */}
			<div className="w-[35%] h-full border-r border-[--border] overflow-hidden">
				<ChatPanel projectId={projectId} />
			</div>

			{/* Spec Editor — 40% */}
			<div className="w-[40%] h-full border-r border-[--border] overflow-hidden">
				<SpecEditor
					projectId={projectId}
					onSpecChange={(id, content, status) => {
						setSpecId(id);
						setSpecContent(content);
						setSpecStatus(status);
					}}
				/>
			</div>

			{/* Validation Panel — 25% */}
			<div className="w-[25%] h-full overflow-hidden">
				<ValidationPanel
					specId={specId}
					specContent={specContent}
					status={specStatus}
				/>
			</div>
		</div>
	);
}
