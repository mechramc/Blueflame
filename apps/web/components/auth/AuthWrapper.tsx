"use client";

import { isDevMode } from "@/lib/api-client";
import type { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { DevAuthProvider } from "./DevAuthProvider";

/**
 * Conditionally wraps children with the appropriate auth provider.
 * Dev mode: DevAuthProvider (role picker banner).
 * Production: AuthProvider (MSAL/Entra ID).
 */
export function AuthWrapper({ children }: { children: ReactNode }) {
	if (isDevMode) {
		return <DevAuthProvider>{children}</DevAuthProvider>;
	}

	return <AuthProvider>{children}</AuthProvider>;
}
