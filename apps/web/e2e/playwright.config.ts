import { defineConfig } from "@playwright/test";

export default defineConfig({
	globalSetup: "./global-setup.ts",
	globalTeardown: "./global-teardown.ts",
	testDir: "./workflows",
	fullyParallel: false,
	workers: 1,
	retries: 1,
	timeout: 60_000,
	expect: { timeout: 10_000 },
	reporter: [["html", { open: "never" }], ["list"]],
	use: {
		baseURL: "http://localhost:3000",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		headless: true,
	},
	projects: [
		{
			name: "chromium",
			use: { browserName: "chromium" },
		},
	],
	webServer: [
		{
			command: "npm run dev",
			cwd: "../..",
			port: 4000,
			reuseExistingServer: true,
			timeout: 30_000,
			env: { NODE_ENV: "development" },
		},
		{
			command: "npm run dev",
			port: 3000,
			reuseExistingServer: true,
			timeout: 30_000,
			env: { NODE_ENV: "development" },
		},
	],
});
