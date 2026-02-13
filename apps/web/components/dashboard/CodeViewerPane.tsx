"use client";

interface CodeViewerPaneProps {
	selectedFile: { path: string; content: string } | null;
}

/**
 * CodeViewerPane — displays file content with line numbers.
 * Center pane of the 3-pane IDE layout.
 */
export function CodeViewerPane({ selectedFile }: CodeViewerPaneProps) {
	if (!selectedFile) {
		return (
			<div className="h-full flex items-center justify-center bg-[--bg-secondary] text-[--text-muted] text-sm">
				Select a file to view its content
			</div>
		);
	}

	const lines = selectedFile.content.split("\n");

	return (
		<div className="h-full flex flex-col bg-[--bg-secondary]">
			{/* Tab header */}
			<div className="px-3 py-1.5 border-b border-gray-800 bg-[--bg-primary] flex items-center gap-2">
				<span className="text-xs font-mono text-blue-300 truncate">{selectedFile.path}</span>
			</div>
			{/* Code content */}
			<div className="flex-1 overflow-auto">
				<pre className="text-xs font-mono leading-5 p-2">
					<table className="border-collapse">
						<tbody>
							{lines.map((line, i) => (
								<tr key={`line-${i + 1}`} className="hover:bg-gray-800/40">
									<td className="text-right pr-3 select-none text-[--text-muted] w-10 align-top">
										{i + 1}
									</td>
									<td className="text-[--text-primary] whitespace-pre">{line}</td>
								</tr>
							))}
						</tbody>
					</table>
				</pre>
			</div>
		</div>
	);
}
