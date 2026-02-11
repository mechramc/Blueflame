/**
 * Sign-in button — triggers MSAL redirect flow for Entra ID SSO.
 */

"use client";

import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../../lib/msal-config";

export function SignInButton() {
	const { instance } = useMsal();

	const handleSignIn = () => {
		instance.loginRedirect(loginRequest);
	};

	return (
		<button
			type="button"
			onClick={handleSignIn}
			className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
		>
			Sign in with Microsoft
		</button>
	);
}
