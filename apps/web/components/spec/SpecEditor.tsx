"use client";

import { SpecStatus } from "@blueflame/shared";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface SpecEditorProps {
	projectId: string;
}

interface SpecData {
	specId: string;
	status: SpecStatus;
	yamlContent: string;
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

export function SpecEditor({ projectId }: SpecEditorProps) {
	const [content, setContent] = useState(PLACEHOLDER_YAML);
	const [status, setStatus] = useState<SpecStatus>(SpecStatus.Draft);
	const [specId, setSpecId] = useState<string | null>(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Load existing spec on mount
	useEffect(() => {
		async function loadSpec() {
			try {
				const res = await fetch(`${API_BASE}/api/specs/${projectId}`);
				if (res.ok) {
					const data = (await res.json()) as { spec: SpecData };
					if (data.spec) {
						setSpecId(data.spec.specId);
						setStatus(data.spec.status);
						setContent(data.spec.yamlContent);
					}
				}
			} catch {
				// API not available — start with placeholder
			}
		}
		loadSpec();
	}, [projectId]);

	const handleGenerateSpec = useCallback(async () => {
		setIsGenerating(true);
		setError(null);
		try {
			const res = await fetch(`${API_BASE}/api/specs/generate`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ projectId }),
			});

			if (res.ok) {
				const data = (await res.json()) as { spec: SpecData };
				setSpecId(data.spec.specId);
				setStatus(data.spec.status);
				setContent(data.spec.yamlContent);
			} else {
				const errData = (await res.json()) as { error: string };
				setError(errData.error ?? "Spec generation failed");
			}
		} catch {
			setError("Cannot reach API — ensure the server is running on port 4000");
		} finally {
			setIsGenerating(false);
		}
	}, [projectId]);

	const handleAccept = useCallback(async () => {
		if (!specId) return;
		try {
			const res = await fetch(`${API_BASE}/api/specs/${specId}/accept`, {
				method: "PUT",
			});
			if (res.ok) {
				setStatus(SpecStatus.Accepted);
			}
		} catch {
			setError("Failed to accept spec");
		}
	}, [specId]);

	const handleFreeze = useCallback(async () => {
		if (!specId) return;
		try {
			const res = await fetch(`${API_BASE}/api/specs/${specId}/freeze`, {
				method: "PUT",
			});
			if (res.ok) {
				setStatus(SpecStatus.Frozen);
			}
		} catch {
			setError("Failed to freeze spec");
		}
	}, [specId]);

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
					{isGenerating && (
						<span className="text-xs text-blue-400 animate-pulse">Generating...</span>
					)}
				</div>
				<SpecActions
					status={status}
					onAccept={handleAccept}
					onFreeze={handleFreeze}
					onGenerateSpec={handleGenerateSpec}
				/>
			</div>

			{/* Error banner */}
			{error && (
				<div className="bg-red-900/30 border-b border-red-800 px-4 py-2 text-xs text-red-300">
					{error}
					<button
						type="button"
						onClick={() => setError(null)}
						className="ml-2 text-red-400 hover:text-red-200"
					>
						Dismiss
					</button>
				</div>
			)}

			{/* Editor */}
			<div className="flex-1">
				<MonacoEditor
					height="100%"
					language="yaml"
					theme="vs-dark"
					value={content}
					onChange={handleEditorChange}
					options={{
						readOnly: status === SpecStatus.Frozen || isGenerating,
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
