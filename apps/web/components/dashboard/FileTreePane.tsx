"use client";

import type { PlanTask } from "@blueflame/shared";

export interface TaskOutput {
	files: Array<{ path: string; content: string; action: string }>;
	error?: string;
	commitMessage?: string;
}

interface FileTreePaneProps {
	taskOutputs: Record<string, TaskOutput>;
	tasks: PlanTask[];
	selectedFilePath: string | null;
	onSelectFile: (file: { path: string; content: string }) => void;
}

const STATUS_ICONS: Record<string, string> = {
	COMPLETED: "\u2713",
	RUNNING: "\u25CB",
	FAILED: "\u2717",
	PENDING: "\u2022",
	DEFERRED: "\u23F8",
};

const STATUS_COLORS: Record<string, string> = {
	COMPLETED: "text-emerald-400",
	RUNNING: "text-blue-400",
	FAILED: "text-red-400",
	PENDING: "text-[--text-muted]",
	DEFERRED: "text-yellow-400",
};

/**
 * FileTreePane — shows generated files grouped by task.
 * Left pane of the 3-pane IDE layout.
 */
export function FileTreePane({
	taskOutputs,
	tasks,
	selectedFilePath,
	onSelectFile,
}: FileTreePaneProps) {
	const hasAnyOutput = Object.keys(taskOutputs).length > 0;

	return (
		<div className="h-full flex flex-col bg-[--bg-primary] border-r border-gray-800">
			<div className="px-3 py-2 border-b border-gray-800">
				<h3 className="text-xs font-semibold uppercase text-[--text-muted] tracking-wider">
					Files
				</h3>
			</div>
			<div className="flex-1 overflow-y-auto px-1 py-1 text-sm font-mono">
				{!hasAnyOutput && (
					<div className="px-3 py-4 text-xs text-[--text-muted] italic">
						Waiting for agents to generate files...
					</div>
				)}
				{tasks.map((task) => {
					const output = taskOutputs[task.id];
					const statusIcon = STATUS_ICONS[task.status] ?? "\u2022";
					const statusColor = STATUS_COLORS[task.status] ?? "text-[--text-muted]";

					return (
						<div key={task.id} className="mb-2">
							{/* Task header */}
							<div className="flex items-center gap-1.5 px-2 py-1 text-xs">
								<span className={statusColor}>{statusIcon}</span>
								<span className="text-[--text-secondary] truncate" title={task.description}>
									{task.id}
								</span>
							</div>

							{/* Error message */}
							{output?.error && (
								<div className="px-6 py-1 text-xs text-red-400 break-words">{output.error}</div>
							)}

							{/* File list */}
							{output?.files.map((file) => (
								<button
									key={file.path}
									type="button"
									onClick={() => onSelectFile(file)}
									className={`w-full text-left px-6 py-0.5 text-xs truncate hover:bg-gray-800 transition-colors ${
										selectedFilePath === file.path
											? "bg-blue-900/30 text-blue-300"
											: "text-[--text-primary]"
									}`}
									title={file.path}
								>
									{file.path}
								</button>
							))}

							{/* Running but no output yet */}
							{task.status === "RUNNING" && !output && (
								<div className="px-6 py-0.5 text-xs text-blue-400/60 animate-pulse">
									generating...
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
