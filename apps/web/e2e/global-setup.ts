import { API_BASE } from "./fixtures/test-data";

async function globalSetup() {
	const maxRetries = 10;
	const delay = 2000;

	for (let i = 0; i < maxRetries; i++) {
		try {
			const res = await fetch(`${API_BASE}/health`);
			if (res.ok) {
				console.log("API server is healthy");
				return;
			}
		} catch {
			// Server not ready yet
		}
		console.log(`Waiting for API server... (${i + 1}/${maxRetries})`);
		await new Promise((r) => setTimeout(r, delay));
	}
	throw new Error("API server did not become healthy in time");
}

export default globalSetup;
