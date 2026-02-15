import type { APIRequestContext } from "@playwright/test";
import { API_BASE } from "../fixtures/test-data";

export async function seedDemoData(request: APIRequestContext) {
	const res = await request.post(`${API_BASE}/api/demo/seed`);
	if (!res.ok()) {
		throw new Error(`Failed to seed demo data: ${res.status()} ${await res.text()}`);
	}
	return res.json();
}

export async function resetDemoData(request: APIRequestContext) {
	const res = await request.post(`${API_BASE}/api/demo/reset`);
	if (!res.ok()) {
		throw new Error(`Failed to reset demo data: ${res.status()} ${await res.text()}`);
	}
	return res.json();
}

export async function createProject(request: APIRequestContext, name: string, description: string) {
	const res = await request.post(`${API_BASE}/api/projects`, {
		data: { name, description },
	});
	if (!res.ok()) {
		throw new Error(`Failed to create project: ${res.status()} ${await res.text()}`);
	}
	return res.json();
}

export async function getProject(request: APIRequestContext, projectId: string) {
	const res = await request.get(`${API_BASE}/api/projects/${projectId}`);
	if (!res.ok()) {
		throw new Error(`Failed to get project: ${res.status()} ${await res.text()}`);
	}
	return res.json();
}

export async function acceptSpec(request: APIRequestContext, specId: string) {
	const res = await request.post(`${API_BASE}/api/specs/${specId}/accept`);
	if (!res.ok()) {
		throw new Error(`Failed to accept spec: ${res.status()} ${await res.text()}`);
	}
	return res.json();
}

export async function freezeSpec(request: APIRequestContext, specId: string) {
	const res = await request.post(`${API_BASE}/api/specs/${specId}/freeze`);
	if (!res.ok()) {
		throw new Error(`Failed to freeze spec: ${res.status()} ${await res.text()}`);
	}
	return res.json();
}
