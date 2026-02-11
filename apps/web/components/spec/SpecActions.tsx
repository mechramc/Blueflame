"use client";

import { SpecStatus } from "@blueflame/shared";

interface SpecActionsProps {
	status: SpecStatus;
	onAccept: () => void;
	onFreeze: () => void;
	onGenerateSpec: () => void;
	disabled?: boolean;
}

export function SpecActions({
	status,
	onAccept,
	onFreeze,
	onGenerateSpec,
	disabled = false,
}: SpecActionsProps) {
	return (
		<div className="flex items-center gap-2">
			{status === SpecStatus.Draft && (
				<>
					<button
						onClick={onGenerateSpec}
						disabled={disabled}
						type="button"
						className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:bg-gray-600 disabled:opacity-50"
					>
						Regenerate
					</button>
					<button
						onClick={onAccept}
						disabled={disabled}
						type="button"
						className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
					>
						Accept
					</button>
				</>
			)}
			{status === SpecStatus.Accepted && (
				<button
					onClick={onFreeze}
					disabled={disabled}
					type="button"
					className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
				>
					Freeze
				</button>
			)}
			{status === SpecStatus.Frozen && (
				<span className="text-xs text-gray-500">Spec is frozen — no edits allowed</span>
			)}
		</div>
	);
}
