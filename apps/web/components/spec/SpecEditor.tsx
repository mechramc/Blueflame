"use client";

import { SpecStatus } from "@blueflame/shared";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { SpecActions } from "./SpecActions";
import { SpecStatusBadge } from "./SpecStatusBadge";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
	ssr: false,
	loading: () => (
		<div className="flex h-full items-center justify-center text-sm text-gray-500">
			Loading editor...
		</div>
	),
});

interface SpecEditorProps {
	projectId: string;
	onGenerateSpec: () => void;
}

const PLACEHOLDER_YAML = `# Specification will appear here after generation
# Use the chat panel to describe your project, then click "Generate Spec"
title: ""
description: ""
deliverables: []
acceptance_criteria: []
constraints:
  must: []
  must_not: []
non_goals: []
risks: []
definition_of_done: ""
`;

export function SpecEditor({ projectId: _projectId, onGenerateSpec }: SpecEditorProps) {
	const [content, setContent] = useState(PLACEHOLDER_YAML);
	const [status, setStatus] = useState<SpecStatus>(SpecStatus.Draft);

	const handleAccept = useCallback(() => {
		setStatus(SpecStatus.Accepted);
	}, []);

	const handleFreeze = useCallback(() => {
		setStatus(SpecStatus.Frozen);
	}, []);

	const handleEditorChange = useCallback(
		(value: string | undefined) => {
			if (status === SpecStatus.Frozen) return;
			setContent(value ?? "");
		},
		[status],
	);

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
				<div className="flex items-center gap-3">
					<h2 className="text-sm font-semibold text-gray-200">Specification</h2>
					<SpecStatusBadge status={status} />
				</div>
				<SpecActions
					status={status}
					onAccept={handleAccept}
					onFreeze={handleFreeze}
					onGenerateSpec={onGenerateSpec}
				/>
			</div>

			{/* Editor */}
			<div className="flex-1">
				<MonacoEditor
					height="100%"
					language="yaml"
					theme="vs-dark"
					value={content}
					onChange={handleEditorChange}
					options={{
						readOnly: status === SpecStatus.Frozen,
						minimap: { enabled: false },
						fontSize: 13,
						lineNumbers: "on",
						wordWrap: "on",
						scrollBeyondLastLine: false,
						padding: { top: 12, bottom: 12 },
						tabSize: 2,
					}}
				/>
			</div>
		</div>
	);
}
