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
						className="rounded border border-[--border-bright] px-3 py-1 text-xs font-medium text-[--text-secondary] transition-colors hover:bg-[--bg-tertiary] hover:text-[--text-primary] disabled:opacity-50"
					>
						Regenerate
					</button>
					<button
						onClick={onAccept}
						disabled={disabled}
						type="button"
						className="rounded border border-[--accent] px-3 py-1 text-xs font-medium text-blue-400 transition-colors hover:bg-[--accent]/10 disabled:opacity-50"
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
					className="rounded border border-emerald-500 px-3 py-1 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10 disabled:opacity-50"
				>
					Freeze
				</button>
			)}
			{status === SpecStatus.Frozen && (
				<span className="text-xs text-[--text-muted]">Spec is frozen</span>
			)}
		</div>
	);
}
