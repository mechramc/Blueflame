/**
 * UserMenu — displays authenticated user's name, email, and sign-out button.
 */

"use client";

import { useAccount, useMsal } from "@azure/msal-react";

export function UserMenu() {
	const { instance, accounts } = useMsal();
	const account = useAccount(accounts[0] ?? undefined);

	const handleSignOut = () => {
		instance.logoutRedirect();
	};

	if (!account) {
		return null;
	}

	return (
		<div className="flex items-center gap-3">
			<div className="text-right">
				<p className="text-sm font-medium text-gray-900">{account.name}</p>
				<p className="text-xs text-gray-500">{account.username}</p>
			</div>
			<button
				type="button"
				onClick={handleSignOut}
				className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
			>
				Sign out
			</button>
		</div>
	);
}
