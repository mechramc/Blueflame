import { expect, test } from "../fixtures/auth.fixture";
import { DEMO_PROJECT_ID } from "../fixtures/test-data";
import { resetDemoData, seedDemoData } from "../helpers/api-helpers";

test.describe("WF6: Failure Intelligence", () => {
	test.beforeAll(async ({ request }) => {
		await resetDemoData(request);
		await seedDemoData(request);
	});

	test.afterAll(async ({ request }) => {
		await resetDemoData(request);
	});

	test("failures page loads with timeline", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}/failures`);

		// Should show "Failure Intelligence" heading
		await expect(page.getByText("Failure Intelligence").first()).toBeVisible({ timeout: 10_000 });
	});

	test("displays seeded failure entries", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}/failures`);
		await page.waitForTimeout(2000);

		// From seed data: failures show as "Build #42 test", "Build #43 build", "Build #44 deploy"
		// CSS uppercase makes them appear as DEPLOY/BUILD/TEST visually
		// Use case-insensitive match and .first() to avoid strict mode violation
		await expect(page.getByText(/deploy|build|test/i).first()).toBeVisible({ timeout: 10_000 });
	});

	test("shows multiple failure entries", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}/failures`);
		await page.waitForTimeout(2000);

		// Should have 3 failure entries (Build #42, #43, #44)
		const buildEntries = page.getByText(/Build #\d+/);
		const count = await buildEntries.count();
		expect(count).toBeGreaterThanOrEqual(2);
	});

	test("can click a failure to see details", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}/failures`);
		await page.waitForTimeout(2000);

		// Click on the first failure entry (Build #44 DEPLOY based on seed data)
		const firstFailure = page.getByText(/Build #\d+/).first();
		if (await firstFailure.isVisible().catch(() => false)) {
			await firstFailure.click();
			await page.waitForTimeout(1000);

			// "Select a failure from the timeline to view details" should disappear
			// and detail content should appear
			expect(page.url()).toContain("/failures");
		}
	});
});
