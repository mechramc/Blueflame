"use client";

import { UserRole } from "@blueflame/shared";
import { useState } from "react";
import { AuthorizeModal } from "./AuthorizeModal.js";

interface AuthorizeButtonProps {
	userRoles: string[];
	budget: number;
	taskCount: number;
	onAuthorize: () => void;
	disabled?: boolean;
}

const ROLE_HIERARCHY: UserRole[] = [
	UserRole.Viewer,
	UserRole.Editor,
	UserRole.Authorizer,
	UserRole.Admin,
];

function hasMinRole(userRoles: string[], minRole: UserRole): boolean {
	const minLevel = ROLE_HIERARCHY.indexOf(minRole);
	return userRoles.some((r) => ROLE_HIERARCHY.indexOf(r as UserRole) >= minLevel);
}

export function AuthorizeButton({
	userRoles,
	budget,
	taskCount,
	onAuthorize,
	disabled = false,
}: AuthorizeButtonProps) {
	const [showModal, setShowModal] = useState(false);
	const [ripple, setRipple] = useState(false);
	const canAuthorize = hasMinRole(userRoles, UserRole.Authorizer);
	const isReady = canAuthorize && !disabled;

	const handleClick = () => {
		if (canAuthorize) {
			setRipple(true);
			setShowModal(true);
		}
	};

	const handleConfirm = () => {
		setShowModal(false);
		onAuthorize();
	};

	return (
		<>
			<div className="relative inline-block">
				<button
					type="button"
					onClick={handleClick}
					disabled={disabled || !canAuthorize}
					className={`rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed ${isReady ? "animate-pulse-glow" : ""}`}
					title={canAuthorize ? "Authorize execution" : "Requires Authorizer role or higher"}
				>
					Authorize Execution
				</button>
				{ripple && (
					<span
						className="absolute inset-0 rounded bg-green-400 animate-launch-ripple pointer-events-none"
						onAnimationEnd={() => setRipple(false)}
					/>
				)}
			</div>
			{!canAuthorize && (
				<p className="text-xs text-red-500 mt-1">Requires Blueflame_Authorizer role or higher</p>
			)}
			{showModal && (
				<AuthorizeModal
					budget={budget}
					taskCount={taskCount}
					onConfirm={handleConfirm}
					onCancel={() => setShowModal(false)}
				/>
			)}
		</>
	);
}
