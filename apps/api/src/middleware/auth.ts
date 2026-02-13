/**
 * JWT authentication middleware — validates Entra ID access tokens.
 *
 * Dev mode: When ENTRA_TENANT_ID is not set, reads X-Dev-Role header
 * to simulate RBAC without Azure credentials. Default role: Blueflame_Admin.
 *
 * Production mode: Validates Bearer token against Azure AD's JWKS endpoint.
 */

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { logAuditEvent } from "../services/audit-logger.js";

const tenantId = process.env.ENTRA_TENANT_ID ?? "";
const clientId = process.env.ENTRA_CLIENT_ID ?? "";
const apiUri = process.env.ENTRA_API_URI ?? `api://${clientId}`;

/** Whether we're running in dev mode (no Entra credentials configured) */
export const isDevMode = !tenantId;

const client = isDevMode
	? null
	: jwksClient({
			jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
			cache: true,
			cacheMaxAge: 86400000, // 24 hours
			rateLimit: true,
		});

/** Claims extracted from a validated Entra ID JWT */
export interface EntraTokenClaims {
	oid: string; // Object ID (user identifier)
	sub: string;
	name: string;
	preferred_username: string;
	email?: string;
	roles?: string[]; // App roles (Blueflame.Viewer, etc.)
	tid: string; // Tenant ID
	aud: string; // Audience (client ID)
	iss: string; // Issuer
	iat: number;
	exp: number;
}

// Extend Express Request to include user claims
declare global {
	namespace Express {
		interface Request {
			user?: EntraTokenClaims;
		}
	}
}

const VALID_ROLES = [
	"Blueflame_Viewer",
	"Blueflame_Editor",
	"Blueflame_Authorizer",
	"Blueflame_Admin",
];

function getSigningKey(header: jwt.JwtHeader, callback: (err: Error | null, key?: string) => void) {
	if (!client) {
		callback(new Error("JWKS client not initialized in dev mode"));
		return;
	}
	client.getSigningKey(header.kid, (err, key) => {
		if (err) {
			callback(err);
			return;
		}
		const signingKey = key?.getPublicKey();
		callback(null, signingKey);
	});
}

/**
 * Middleware that validates authentication.
 *
 * Dev mode: Reads X-Dev-Role header (default: Blueflame_Admin) and injects
 * a synthetic user into req.user.
 *
 * Production mode: Validates Entra ID JWT Bearer token.
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
	if (isDevMode) {
		const devRole = req.headers["x-dev-role"] as string | undefined;
		const role = devRole && VALID_ROLES.includes(devRole) ? devRole : "Blueflame_Admin";

		req.user = {
			oid: "dev-user-001",
			sub: "dev-user-001",
			name: "Dev User",
			preferred_username: "dev@blueflame.local",
			email: "dev@blueflame.local",
			roles: [role],
			tid: "dev-tenant",
			aud: "dev-client",
			iss: "dev-issuer",
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + 3600,
		};

		// Log non-GET auth events for compliance
		if (req.method !== "GET") {
			logAuditEvent({
				eventType: "AUTH",
				actor: `dev@blueflame.local (${role})`,
				action: `${req.method} ${req.path}`,
				resource: req.path,
				outcome: "ALLOWED",
				details: `Dev mode auth — role: ${role}`,
			}).catch(() => {});
		}

		next();
		return;
	}

	const authHeader = req.headers.authorization;

	if (!authHeader?.startsWith("Bearer ")) {
		res.status(401).json({ error: "Missing or invalid Authorization header" });
		return;
	}

	const token = authHeader.slice(7);

	jwt.verify(
		token,
		getSigningKey,
		{
			audience: apiUri,
			issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
			algorithms: ["RS256"],
		},
		(err, decoded) => {
			if (err) {
				res.status(401).json({ error: "Invalid or expired token" });
				return;
			}

			req.user = decoded as EntraTokenClaims;
			next();
		},
	);
}

/**
 * Role-checking middleware factory. Requires the user to have at least
 * the specified role (based on role hierarchy).
 */
export function requireRole(...allowedRoles: string[]) {
	return (req: Request, res: Response, next: NextFunction) => {
		const userRoles = req.user?.roles ?? [];
		const hasRole = allowedRoles.some((r) => userRoles.includes(r));

		// Admin always has access
		if (hasRole || userRoles.includes("Blueflame_Admin")) {
			next();
			return;
		}

		res.status(403).json({ error: "Insufficient permissions" });
	};
}
