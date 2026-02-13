"use client";

import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";

type DevRole = "Blueflame_Viewer" | "Blueflame_Editor" | "Blueflame_Authorizer" | "Blueflame_Admin";

interface DevUser {
	oid: string;
	name: string;
	preferred_username: string;
	email: string;
	roles: DevRole[];
}

interface DevAuthContextValue {
	devRole: DevRole;
	setDevRole: (role: DevRole) => void;
	devUser: DevUser;
}

const DevAuthContext = createContext<DevAuthContextValue | null>(null);

const ROLE_LABELS: Record<DevRole, string> = {
	Blueflame_Viewer: "Viewer",
	Blueflame_Editor: "Editor",
	Blueflame_Authorizer: "Authorizer",
	Blueflame_Admin: "Admin",
};

const ROLES: DevRole[] = [
	"Blueflame_Viewer",
	"Blueflame_Editor",
	"Blueflame_Authorizer",
	"Blueflame_Admin",
];

function makeDevUser(role: DevRole): DevUser {
	return {
		oid: "dev-user-001",
		name: "Dev User",
		preferred_username: "dev@blueflame.local",
		email: "dev@blueflame.local",
		roles: [role],
	};
}

export function DevAuthProvider({ children }: { children: ReactNode }) {
	const [devRole, setDevRoleState] = useState<DevRole>("Blueflame_Admin");

	useEffect(() => {
		const stored = localStorage.getItem("bf-dev-role") as DevRole | null;
		if (stored && ROLES.includes(stored)) {
			setDevRoleState(stored);
		}
	}, []);

	const setDevRole = useCallback((role: DevRole) => {
		setDevRoleState(role);
		localStorage.setItem("bf-dev-role", role);
	}, []);

	const devUser = makeDevUser(devRole);

	return (
		<DevAuthContext.Provider value={{ devRole, setDevRole, devUser }}>
			{/* Dev mode banner */}
			<div className="flex items-center justify-between bg-amber-500/10 border-b border-amber-500/30 px-4 py-1.5">
				<span className="text-xs font-medium text-amber-400">
					Dev Mode — No Entra ID configured
				</span>
				<div className="flex items-center gap-2">
					<label className="text-xs text-amber-400/80" htmlFor="dev-role-select">
						Role:
					</label>
					<select
						id="dev-role-select"
						value={devRole}
						onChange={(e) => setDevRole(e.target.value as DevRole)}
						className="rounded border border-amber-500/30 bg-[--bg-secondary] px-2 py-0.5 text-xs text-[--text-primary] focus:border-amber-500 focus:outline-none"
					>
						{ROLES.map((r) => (
							<option key={r} value={r}>
								{ROLE_LABELS[r]}
							</option>
						))}
					</select>
				</div>
			</div>
			{children}
		</DevAuthContext.Provider>
	);
}

export function useDevAuth(): DevAuthContextValue {
	const ctx = useContext(DevAuthContext);
	if (!ctx) {
		throw new Error("useDevAuth must be used within a DevAuthProvider");
	}
	return ctx;
}

export { DevAuthContext, type DevRole, type DevUser };
