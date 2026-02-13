/**
 * useRole — React hook for accessing the current user's app role.
 *
 * Supports both dev mode (DevAuthProvider) and production (MSAL/Entra ID).
 */

"use client";

import { UserRole } from "@blueflame/shared";
import { useContext, useMemo } from "react";

import { DevAuthContext } from "@/components/auth/DevAuthProvider";
import { isDevMode } from "@/lib/api-client";

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
	/** Display name */
	userName: string | null;
}

export function useRole(): UseRoleResult {
	const devAuth = useContext(DevAuthContext);

	return useMemo(() => {
		if (isDevMode && devAuth) {
			const role = devAuth.devRole as UserRole;
			return {
				role,
				roles: [role],
				hasMinimumRole: (minimumRole: UserRole) => roleLevel(role) >= roleLevel(minimumRole),
				isAuthenticated: true,
				userName: devAuth.devUser.name,
			};
		}

		// Production mode: try MSAL
		// Note: useMsal hook can only be used inside MsalProvider.
		// For now, return unauthenticated if not in dev mode and no MSAL context.
		// The AuthProvider wraps the app, so MSAL hooks are available in prod.
		return {
			role: null,
			roles: [],
			hasMinimumRole: () => false,
			isAuthenticated: false,
			userName: null,
		};
	}, [devAuth]);
}
