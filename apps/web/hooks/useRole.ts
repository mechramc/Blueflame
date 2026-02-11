/**
 * useRole — React hook for accessing the current user's Entra ID app role.
 *
 * Returns the highest role and helpers for role-based UI gating.
 */

"use client";

import { useAccount, useMsal } from "@azure/msal-react";
import { UserRole } from "@blueflame/shared";
import { useMemo } from "react";

/** Role hierarchy — higher index = more permissions */
const ROLE_HIERARCHY: UserRole[] = [
	UserRole.Viewer,
	UserRole.Editor,
	UserRole.Authorizer,
	UserRole.Admin,
];

function roleLevel(role: UserRole): number {
	return ROLE_HIERARCHY.indexOf(role);
}

interface UseRoleResult {
	/** The user's highest role, or null if not authenticated */
	role: UserRole | null;
	/** All roles assigned to the user */
	roles: UserRole[];
	/** Whether the user has at least the given role */
	hasMinimumRole: (minimumRole: UserRole) => boolean;
	/** Whether the user is authenticated */
	isAuthenticated: boolean;
}

export function useRole(): UseRoleResult {
	const { accounts } = useMsal();
	const account = useAccount(accounts[0] ?? undefined);

	return useMemo(() => {
		if (!account) {
			return {
				role: null,
				roles: [],
				hasMinimumRole: () => false,
				isAuthenticated: false,
			};
		}

		// Entra ID stores app roles in idTokenClaims.roles
		const claims = account.idTokenClaims as { roles?: string[] } | undefined;
		const rawRoles = claims?.roles ?? [];
		const userRoles = rawRoles.filter((r) => ROLE_HIERARCHY.includes(r as UserRole)) as UserRole[];

		let highest: UserRole | null = null;
		let highestLevel = -1;
		for (const role of userRoles) {
			const level = roleLevel(role);
			if (level > highestLevel) {
				highestLevel = level;
				highest = role;
			}
		}

		return {
			role: highest,
			roles: userRoles,
			hasMinimumRole: (minimumRole: UserRole) =>
				userRoles.some((r) => roleLevel(r) >= roleLevel(minimumRole)),
			isAuthenticated: true,
		};
	}, [account]);
}
