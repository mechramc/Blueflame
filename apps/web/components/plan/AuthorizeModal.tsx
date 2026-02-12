"use client";

interface AuthorizeModalProps {
	budget: number;
	taskCount: number;
	onConfirm: () => void;
	onCancel: () => void;
}

export function AuthorizeModal({ budget, taskCount, onConfirm, onCancel }: AuthorizeModalProps) {
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
			data-testid="authorize-modal"
		>
			<div className="bg-[--bg-secondary] border border-[--border] rounded-lg shadow-xl p-6 max-w-md w-full mx-4 animate-modal-blast">
				<h2 className="text-lg font-semibold text-[--text-primary] mb-2">Confirm Authorization</h2>
				<p className="text-sm text-[--text-secondary] mb-4">
					You are about to authorize agent execution. This will create an immutable plan lock and
					allow agents to begin work.
				</p>
				<div className="bg-[--bg-tertiary] rounded p-3 mb-4 text-sm space-y-1">
					<div className="flex justify-between">
						<span className="text-[--text-muted]">Tasks:</span>
						<span className="font-medium font-mono text-[--text-primary]">{taskCount}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-[--text-muted]">Budget ceiling:</span>
						<span className="font-medium font-mono text-[--text-primary]">
							${budget.toFixed(2)}
						</span>
					</div>
				</div>
				<div className="flex justify-end gap-3">
					<button
						type="button"
						onClick={onCancel}
						className="rounded border border-[--border-bright] px-4 py-2 text-sm text-[--text-secondary] hover:bg-[--bg-tertiary]"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={onConfirm}
						className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
					>
						Authorize
					</button>
				</div>
			</div>
		</div>
	);
}
