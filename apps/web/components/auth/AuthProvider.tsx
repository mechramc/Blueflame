/**
 * MSAL AuthProvider — wraps the app with MsalProvider for Entra ID SSO.
 *
 * Usage in layout.tsx:
 *   <AuthProvider><App /></AuthProvider>
 */

"use client";

import { type EventMessage, EventType, type PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { type ReactNode, useEffect, useState } from "react";
import { msalConfig } from "../../lib/msal-config";

interface AuthProviderProps {
	children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
	const [msalInstance, setMsalInstance] = useState<PublicClientApplication | null>(null);

	useEffect(() => {
		async function initMsal() {
			// Dynamic import to avoid SSR issues with MSAL
			const { PublicClientApplication } = await import("@azure/msal-browser");
			const instance = new PublicClientApplication(msalConfig);
			await instance.initialize();

			// Set the first account as active if one exists
			const accounts = instance.getAllAccounts();
			if (accounts.length > 0 && accounts[0]) {
				instance.setActiveAccount(accounts[0]);
			}

			// Listen for sign-in events to set active account
			instance.addEventCallback((event: EventMessage) => {
				if (
					event.eventType === EventType.LOGIN_SUCCESS &&
					event.payload &&
					"account" in event.payload
				) {
					const account = event.payload.account;
					if (account) {
						instance.setActiveAccount(account);
					}
				}
			});

			setMsalInstance(instance);
		}

		initMsal();
	}, []);

	if (!msalInstance) {
		return null;
	}

	return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}
