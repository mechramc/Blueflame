/**
 * GitHub App installation token management.
 *
 * Handles JWT signing and installation token acquisition/refresh.
 * Tokens are cached and auto-refreshed before expiry.
 */

import { createAppAuth } from "@octokit/auth-app";

export interface GitHubAppConfig {
	/** GitHub App ID */
	appId: string;
	/** PEM-encoded private key */
	privateKey: string;
	/** Installation ID (obtained after installing the app on a repo) */
	installationId: number;
}

interface CachedToken {
	token: string;
	expiresAt: Date;
}

let cachedToken: CachedToken | null = null;

/**
 * Get an installation token, refreshing if expired or about to expire.
 * Tokens are refreshed 5 minutes before expiry.
 */
export async function getInstallationToken(config: GitHubAppConfig): Promise<string> {
	const now = new Date();
	const bufferMs = 5 * 60 * 1000; // 5 minutes before expiry

	if (cachedToken && cachedToken.expiresAt.getTime() - now.getTime() > bufferMs) {
		return cachedToken.token;
	}

	const auth = createAppAuth({
		appId: config.appId,
		privateKey: config.privateKey,
		installationId: config.installationId,
	});

	const result = await auth({ type: "installation" });

	cachedToken = {
		token: result.token,
		expiresAt: new Date(result.expiresAt ?? Date.now() + 60 * 60 * 1000),
	};

	return cachedToken.token;
}

/**
 * Clear the cached token (for testing).
 */
export function clearTokenCache(): void {
	cachedToken = null;
}

/**
 * Check if the token cache has a valid token.
 */
export function hasValidToken(): boolean {
	if (!cachedToken) return false;
	const bufferMs = 5 * 60 * 1000;
	return cachedToken.expiresAt.getTime() - Date.now() > bufferMs;
}
