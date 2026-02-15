import { API_BASE } from "./fixtures/test-data";

/**
 * Global teardown — runs after ALL test suites complete (even on failure).
 * Ensures all demo/seed data is completely removed so the system is production-ready.
 */
async function globalTeardown() {
	try {
		const res = await fetch(`${API_BASE}/api/demo/reset`, { method: "POST" });
		if (res.ok) {
			console.log("Global teardown: demo data reset successfully");
		} else {
			console.warn(`Global teardown: reset returned ${res.status}`);
		}
	} catch {
		console.warn("Global teardown: API server not reachable (may already be stopped)");
	}
}

export default globalTeardown;
