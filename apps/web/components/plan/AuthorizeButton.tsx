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
	const canAuthorize = hasMinRole(userRoles, UserRole.Authorizer);

	const handleClick = () => {
		if (canAuthorize) {
			setShowModal(true);
		}
	};

	const handleConfirm = () => {
		setShowModal(false);
		onAuthorize();
	};

	return (
		<>
			<button
				type="button"
				onClick={handleClick}
				disabled={disabled || !canAuthorize}
				className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
				title={canAuthorize ? "Authorize execution" : "Requires Authorizer role or higher"}
			>
				Authorize Execution
			</button>
			{!canAuthorize && (
				<p className="text-xs text-red-500 mt-1">
					Requires Blueflame_Authorizer role or higher
				</p>
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
