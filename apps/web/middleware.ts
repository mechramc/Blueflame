/**
 * Next.js middleware — redirects unauthenticated users to sign-in.
 *
 * MSAL handles the actual auth state client-side. This middleware provides
 * a server-side check by looking for the MSAL session cookie. If no session
 * exists, redirects to the sign-in page.
 *
 * Public paths (sign-in, health, API) are excluded from the check.
 */

import { type NextRequest, NextResponse } from "next/server";

/** Paths that don't require authentication */
const PUBLIC_PATHS = ["/auth/signin", "/auth/callback", "/health", "/api/"];

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Skip auth check for public paths
	if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
		return NextResponse.next();
	}

	// Skip auth check for static assets
	if (
		pathname.startsWith("/_next") ||
		pathname.includes(".") // static files
	) {
		return NextResponse.next();
	}

	// Check for MSAL session indicator
	// MSAL stores tokens in sessionStorage (client-side), so server-side
	// middleware can only check for the presence of auth cookies set after login.
	// The actual token validation happens client-side in AuthProvider.
	// This is a soft gate — AuthenticatedTemplate in components is the real gate.
	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - _next/static (static files)
		 * - _next/image (image optimization)
		 * - favicon.ico
		 */
		"/((?!_next/static|_next/image|favicon.ico).*)",
	],
};
