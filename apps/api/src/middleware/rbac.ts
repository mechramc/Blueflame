/**
 * RBAC middleware — enforces role requirements per endpoint.
 *
 * Uses the 4-tier Entra ID App Roles from the spec:
 *   Viewer < Editor < Authorizer < Admin
 *
 * Roles are hierarchical: Admin has all permissions of Authorizer, etc.
 */

import { UserRole } from "@blueflame/shared";
import type { NextFunction, Request, Response } from "express";

/** Role hierarchy — higher index = more permissions */
const ROLE_HIERARCHY: UserRole[] = [
	UserRole.Viewer,
	UserRole.Editor,
	UserRole.Authorizer,
	UserRole.Admin,
];

/**
 * Returns the numeric level of a role (0=Viewer, 3=Admin).
 * Returns -1 if the role is not recognized.
 */
function roleLevel(role: UserRole): number {
	return ROLE_HIERARCHY.indexOf(role);
}

/**
 * Gets the highest role from a user's role claims.
 * Returns null if the user has no recognized roles.
 */
export function getHighestRole(roles: string[]): UserRole | null {
	let highest: UserRole | null = null;
	let highestLevel = -1;

	for (const role of roles) {
		const level = roleLevel(role as UserRole);
		if (level > highestLevel) {
			highestLevel = level;
			highest = role as UserRole;
		}
	}

	return highest;
}

/**
 * Checks if the user's roles meet the minimum required role.
 */
export function hasMinimumRole(userRoles: string[], requiredRole: UserRole): boolean {
	const requiredLevel = roleLevel(requiredRole);
	return userRoles.some((r) => roleLevel(r as UserRole) >= requiredLevel);
}

/**
 * Express middleware factory — requires a minimum role to proceed.
 *
 * Usage:
 *   router.post("/authorize", authenticate, requireRole(UserRole.Authorizer), handler);
 *
 * Must be used AFTER the `authenticate` middleware (needs `req.user`).
 */
export function requireRole(minimumRole: UserRole) {
	return (req: Request, res: Response, next: NextFunction) => {
		if (!req.user) {
			res.status(401).json({ error: "Not authenticated" });
			return;
		}

		const userRoles = req.user.roles ?? [];

		if (!hasMinimumRole(userRoles, minimumRole)) {
			res.status(403).json({
				error: "Insufficient permissions",
				required: minimumRole,
				actual: userRoles,
			});
			return;
		}

		next();
	};
}
