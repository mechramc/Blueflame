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
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			data-testid="authorize-modal"
		>
			<div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
				<h2 className="text-lg font-semibold text-gray-900 mb-2">Confirm Authorization</h2>
				<p className="text-sm text-gray-600 mb-4">
					You are about to authorize agent execution. This will create an immutable plan lock
					and allow agents to begin work.
				</p>
				<div className="bg-gray-50 rounded p-3 mb-4 text-sm space-y-1">
					<div className="flex justify-between">
						<span className="text-gray-500">Tasks:</span>
						<span className="font-medium">{taskCount}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-gray-500">Budget ceiling:</span>
						<span className="font-medium font-mono">${budget.toFixed(2)}</span>
					</div>
				</div>
				<div className="flex justify-end gap-3">
					<button
						type="button"
						onClick={onCancel}
						className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={onConfirm}
						className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
					>
						Authorize
					</button>
				</div>
			</div>
		</div>
	);
}
