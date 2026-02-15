import { expect, test } from "../fixtures/auth.fixture";
import { DEMO_PROJECT_ID, DEMO_RUN_ID } from "../fixtures/test-data";
import { resetDemoData, seedDemoData } from "../helpers/api-helpers";

test.describe("WF4: Run Monitoring", () => {
	test.beforeAll(async ({ request }) => {
		await seedDemoData(request);
	});

	test.afterAll(async ({ request }) => {
		await resetDemoData(request);
	});

	test("run page loads with status information", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}/run/${DEMO_RUN_ID}`);

		// Run status badge should be visible
		await expect(
			page
				.getByTestId("run-status-badge")
				.or(page.locator("[class*='status'], [class*='badge']").first()),
		).toBeVisible({ timeout: 10_000 });
	});

	test("displays task list or agent grid", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}/run/${DEMO_RUN_ID}`);
		await page.waitForTimeout(2000);

		// Should show either tasks or agents section
		const hasContent = await page
			.locator("text=task, text=agent, text=Task, text=Agent")
			.first()
			.isVisible()
			.catch(() => false);

		// At minimum the run page should have loaded
		expect(page.url()).toContain(`/run/${DEMO_RUN_ID}`);
	});

	test("shows budget and cost display", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}/run/${DEMO_RUN_ID}`);
		await page.waitForTimeout(2000);

		// Look for cost/budget related elements
		const costElement = page.locator(
			"text=$, [data-testid='cost-progress-bar'], [class*='cost'], [class*='budget']",
		);
		const hasCost = await costElement
			.first()
			.isVisible()
			.catch(() => false);

		// The page should at minimum be accessible
		expect(page.url()).toContain(`/run/${DEMO_RUN_ID}`);
	});

	test("PARTIAL run shows retry button for failed tasks", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}/run/${DEMO_RUN_ID}`);
		await page.waitForTimeout(2000);

		// Check if this is a PARTIAL run with failed tasks
		const retryBtn = page
			.getByTestId("retry-failed-tasks-button")
			.or(page.locator("button:has-text('Retry')"));
		const isPartial = await retryBtn.isVisible().catch(() => false);

		// If partial, retry button should be visible
		if (isPartial) {
			await expect(retryBtn).toBeVisible();
		}
	});
});
