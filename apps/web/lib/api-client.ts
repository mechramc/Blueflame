/**
 * Authenticated API client for Blueflame frontend.
 *
 * Dev mode: Sets X-Dev-Role header from localStorage.
 * Production mode: Acquires MSAL token and sets Authorization: Bearer header.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Whether we're in dev mode (no Entra credentials) */
export const isDevMode = !process.env.NEXT_PUBLIC_ENTRA_CLIENT_ID;

function getDevRole(): string {
	if (typeof window === "undefined") return "Blueflame_Admin";
	return localStorage.getItem("bf-dev-role") ?? "Blueflame_Admin";
}

async function getHeaders(): Promise<Record<string, string>> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};

	if (isDevMode) {
		headers["X-Dev-Role"] = getDevRole();
	}
	// TODO: In production mode, acquire MSAL token and set Authorization header

	return headers;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
	const headers = await getHeaders();
	const res = await fetch(`${API_BASE}${path}`, { headers });

	if (!res.ok) {
		const body = await res.json().catch(() => ({ error: res.statusText }));
		throw new ApiError(res.status, body.error ?? res.statusText);
	}

	return res.json();
}

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
	const headers = await getHeaders();
	const res = await fetch(`${API_BASE}${path}`, {
		method: "POST",
		headers,
		body: body ? JSON.stringify(body) : undefined,
	});

	if (!res.ok) {
		const respBody = await res.json().catch(() => ({ error: res.statusText }));
		throw new ApiError(res.status, respBody.error ?? res.statusText);
	}

	return res.json();
}

export async function apiPut<T = unknown>(path: string, body?: unknown): Promise<T> {
	const headers = await getHeaders();
	const res = await fetch(`${API_BASE}${path}`, {
		method: "PUT",
		headers,
		body: body ? JSON.stringify(body) : undefined,
	});

	if (!res.ok) {
		const respBody = await res.json().catch(() => ({ error: res.statusText }));
		throw new ApiError(res.status, respBody.error ?? res.statusText);
	}

	return res.json();
}

export async function apiDelete<T = unknown>(path: string): Promise<T> {
	const headers = await getHeaders();
	const res = await fetch(`${API_BASE}${path}`, {
		method: "DELETE",
		headers,
	});

	if (!res.ok) {
		const respBody = await res.json().catch(() => ({ error: res.statusText }));
		throw new ApiError(res.status, respBody.error ?? res.statusText);
	}

	return res.json();
}

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message);
		this.name = "ApiError";
	}
}
