/**
 * RoleGate — conditionally renders children based on user's role.
 *
 * Usage:
 *   <RoleGate role={UserRole.Authorizer}>
 *     <AuthorizeButton />
 *   </RoleGate>
 *
 *   <RoleGate role={UserRole.Admin} fallback={<p>Admin only</p>}>
 *     <AdminPanel />
 *   </RoleGate>
 */

"use client";

import type { UserRole } from "@blueflame/shared";
import type { ReactNode } from "react";
import { useRole } from "../../hooks/useRole";

interface RoleGateProps {
	/** Minimum role required to see the children */
	role: UserRole;
	/** Content to show when the user lacks the required role */
	fallback?: ReactNode;
	children: ReactNode;
}

export function RoleGate({ role, fallback = null, children }: RoleGateProps) {
	const { hasMinimumRole, isAuthenticated } = useRole();

	if (!isAuthenticated || !hasMinimumRole(role)) {
		return <>{fallback}</>;
	}

	return <>{children}</>;
}
