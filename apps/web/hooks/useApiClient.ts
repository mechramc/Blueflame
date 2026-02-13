"use client";

import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api-client";

/**
 * React hook providing typed API methods.
 * In dev mode: uses X-Dev-Role header.
 * In prod mode: will use MSAL token (TODO).
 */
export function useApiClient() {
	return {
		get: apiGet,
		post: apiPost,
		put: apiPut,
		delete: apiDelete,
	};
}
