"use client";

import { useEffect, useState } from "react";

export interface ConstraintViolation {
	id: string;
	constraintId: string;
	message: string;
	severity: "warning" | "error";
	agentId?: string;
}

interface ConstraintViolationToastProps {
	violation: ConstraintViolation | null;
	onDismiss: () => void;
	autoDismissMs?: number;
}

export function ConstraintViolationToast({
	violation,
	onDismiss,
	autoDismissMs = 5000,
}: ConstraintViolationToastProps) {
	const [shaking, setShaking] = useState(false);

	useEffect(() => {
		if (!violation) return;
		setShaking(true);
		const shakeTimer = setTimeout(() => setShaking(false), 500);
		const dismissTimer = setTimeout(onDismiss, autoDismissMs);
		return () => {
			clearTimeout(shakeTimer);
			clearTimeout(dismissTimer);
		};
	}, [violation, onDismiss, autoDismissMs]);

	if (!violation) return null;

	const isError = violation.severity === "error";
	const borderColor = isError ? "border-red-500/50" : "border-yellow-500/50";
	const bgColor = isError ? "bg-red-500/10" : "bg-yellow-500/10";
	const textColor = isError ? "text-red-400" : "text-yellow-400";

	return (
		<div
			className={`fixed top-4 right-4 z-[60] max-w-sm w-full animate-slide-in-top ${shaking ? "animate-shake-x" : ""}`}
			data-testid="constraint-violation-toast"
			role="alert"
		>
			<div className={`rounded border ${borderColor} ${bgColor} backdrop-blur-xl p-4 shadow-lg`}>
				<div className="flex items-start gap-3">
					<span className="text-base flex-shrink-0">{isError ? "\u26D4" : "\u26A0\uFE0F"}</span>
					<div className="flex-1 min-w-0">
						<p className={`text-sm font-semibold ${textColor}`}>Constraint Violation</p>
						<p className={`text-xs mt-1 ${textColor} opacity-80`}>{violation.message}</p>
						{violation.agentId && (
							<p className="text-xs mt-1 text-[--text-muted] font-mono">
								Agent: {violation.agentId}
							</p>
						)}
					</div>
					<button
						type="button"
						onClick={onDismiss}
						className={`flex-shrink-0 text-sm ${textColor} opacity-60 hover:opacity-100`}
						data-testid="toast-dismiss"
						aria-label="Dismiss"
					>
						&times;
					</button>
				</div>
			</div>
		</div>
	);
}
