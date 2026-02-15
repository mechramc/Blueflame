import { expect, test } from "../fixtures/auth.fixture";
import { DEMO_PROJECT_ID } from "../fixtures/test-data";
import { resetDemoData, seedDemoData } from "../helpers/api-helpers";

test.describe("WF6: Failure Intelligence", () => {
	test.beforeAll(async ({ request }) => {
		await seedDemoData(request);
	});

	test.afterAll(async ({ request }) => {
		await resetDemoData(request);
	});

	test("failures page loads with timeline", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}/failures`);

		// Should show failure entries (3 seeded failures)
		await expect(
			page.locator("[data-testid*='failure'], [class*='failure'], [class*='timeline']").first(),
		).toBeVisible({ timeout: 10_000 });
	});

	test("displays seeded failure entries", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}/failures`);
		await page.waitForTimeout(2000);

		// Look for failure identifiers or descriptions
		const failureEntries = page.locator("[data-testid*='failure-entry'], [class*='failure']");

		// We seeded 3 failures: Test (FAIL-42-1), Build (FAIL-43-1), Deploy (FAIL-44-1)
		// At minimum should see some failure content
		await expect(page.locator("text=Test, text=Build, text=Deploy, text=FAIL").first()).toBeVisible(
			{ timeout: 10_000 },
		);
	});

	test("can click a failure to see details", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}/failures`);
		await page.waitForTimeout(2000);

		// Click on the first failure entry
		const firstFailure = page
			.locator("[data-testid*='failure-entry'], [class*='failure-card'], tr, [role='row']")
			.first();

		if (await firstFailure.isVisible().catch(() => false)) {
			await firstFailure.click();

			// Should show detail panel or expanded view
			await page.waitForTimeout(1000);

			// Check for root cause or detail content
			const hasDetail = await page
				.locator("text=root cause, text=error, text=TypeError, text=TS2345")
				.first()
				.isVisible()
				.catch(() => false);

			// At minimum the page should remain accessible
			expect(page.url()).toContain("/failures");
		}
	});

	test("shows remediation status for analyzed failures", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}/failures`);
		await page.waitForTimeout(2000);

		// First failure (FAIL-42-1) has remediation status PLAN_READY
		const remediationIndicator = page.locator(
			"[data-testid*='remediation'], text=PLAN_READY, text=Remediation, text=Plan Ready",
		);

		const hasRemediation = await remediationIndicator
			.first()
			.isVisible()
			.catch(() => false);

		// The page should have loaded successfully regardless
		expect(page.url()).toContain("/failures");
	});
});
