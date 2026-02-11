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

/**
 * Slide-in + shake toast for constraint violations.
 * Auto-dismisses after 5s by default. Severity drives color.
 */
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
	const borderColor = isError ? "border-red-400" : "border-yellow-400";
	const bgColor = isError ? "bg-red-50" : "bg-yellow-50";
	const textColor = isError ? "text-red-800" : "text-yellow-800";
	const icon = isError ? "\u26D4" : "\u26A0\uFE0F";

	return (
		<div
			className={`fixed top-4 right-4 z-[60] max-w-sm w-full animate-slide-in-top ${shaking ? "animate-shake-x" : ""}`}
			data-testid="constraint-violation-toast"
			role="alert"
		>
			<div className={`rounded-lg border-2 ${borderColor} ${bgColor} p-4 shadow-lg`}>
				<div className="flex items-start gap-3">
					<span className="text-xl flex-shrink-0">{icon}</span>
					<div className="flex-1 min-w-0">
						<p className={`text-sm font-semibold ${textColor}`}>Constraint Violation</p>
						<p className={`text-xs mt-1 ${textColor} opacity-80`}>{violation.message}</p>
						{violation.agentId && (
							<p className="text-xs mt-1 text-gray-500 font-mono">Agent: {violation.agentId}</p>
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
