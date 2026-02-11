/**
 * MSAL configuration for Azure Entra ID authentication.
 *
 * Requires App Registration in Azure Portal with:
 * - Redirect URI: http://localhost:3000 (dev), https://<domain> (prod)
 * - ID tokens enabled
 * - App roles: Blueflame.Viewer, Blueflame.Editor, Blueflame.Authorizer, Blueflame.Admin
 */

import { type Configuration, LogLevel } from "@azure/msal-browser";

const clientId = process.env.NEXT_PUBLIC_ENTRA_CLIENT_ID ?? "";
const tenantId = process.env.NEXT_PUBLIC_ENTRA_TENANT_ID ?? "";
const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI ?? "http://localhost:3000";

export const msalConfig: Configuration = {
	auth: {
		clientId,
		authority: `https://login.microsoftonline.com/${tenantId}`,
		redirectUri,
		postLogoutRedirectUri: redirectUri,
		navigateToLoginRequestUrl: true,
	},
	cache: {
		cacheLocation: "sessionStorage",
		storeAuthStateInCookie: false,
	},
	system: {
		loggerOptions: {
			logLevel: LogLevel.Warning,
			loggerCallback: (_level, message, containsPii) => {
				if (!containsPii) {
					console.debug("[MSAL]", message);
				}
			},
		},
	},
};

/** Scopes requested during login — User.Read for profile info */
export const loginRequest = {
	scopes: ["User.Read", "openid", "profile", "email"],
};

/** Scopes for accessing the Blueflame API */
export const apiRequest = {
	scopes: [`api://${clientId}/access_as_user`],
};
