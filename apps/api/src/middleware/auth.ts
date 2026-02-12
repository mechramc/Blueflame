/**
 * JWT authentication middleware — validates Entra ID access tokens.
 *
 * Extracts the Bearer token from the Authorization header, validates it
 * against Azure AD's JWKS endpoint, and attaches decoded claims to req.user.
 */

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const tenantId = process.env.ENTRA_TENANT_ID ?? "";
const clientId = process.env.ENTRA_CLIENT_ID ?? "";
const apiUri = process.env.ENTRA_API_URI ?? `api://${clientId}`;

const client = jwksClient({
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

function getSigningKey(header: jwt.JwtHeader, callback: (err: Error | null, key?: string) => void) {
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
 * Middleware that validates an Entra ID JWT Bearer token.
 * On success, attaches decoded claims to `req.user`.
 * On failure, returns 401.
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
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
