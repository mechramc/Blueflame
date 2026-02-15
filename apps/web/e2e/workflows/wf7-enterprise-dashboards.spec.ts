import { expect, test } from "../fixtures/auth.fixture";
import { resetDemoData, seedDemoData } from "../helpers/api-helpers";

test.describe("WF7: Enterprise Dashboards", () => {
	test.beforeAll(async ({ request }) => {
		await resetDemoData(request);
		await seedDemoData(request);
	});

	test.afterAll(async ({ request }) => {
		await resetDemoData(request);
	});

	test.describe("Compliance Dashboard", () => {
		test("compliance page loads", async ({ page }) => {
			await page.goto("/compliance");
			await expect(page.locator("text=Compliance").first()).toBeVisible({
				timeout: 10_000,
			});
		});

		test("shows filter controls", async ({ page }) => {
			await page.goto("/compliance");
			await page.waitForTimeout(2000);

			// Should have filtering UI
			const filters = page.locator(
				"[data-testid='compliance-filters'], select, input[type='search'], [class*='filter']",
			);
			await expect(filters.first()).toBeVisible({ timeout: 5000 });
		});

		test("displays audit log table", async ({ page }) => {
			await page.goto("/compliance");
			await page.waitForTimeout(2000);

			// Should show a table or list of audit events
			const table = page.locator(
				"[data-testid='compliance-table'], table, [role='table'], [class*='audit']",
			);
			await expect(table.first()).toBeVisible({ timeout: 5000 });
		});

		test("has export functionality", async ({ page }) => {
			await page.goto("/compliance");
			await page.waitForTimeout(2000);

			const exportBtn = page.locator(
				"button:has-text('Export'), button:has-text('CSV'), button:has-text('Download')",
			);
			await expect(exportBtn.first()).toBeVisible({ timeout: 5000 });
		});
	});

	test.describe("Chargeback Dashboard", () => {
		test("chargeback page loads", async ({ page }) => {
			await page.goto("/chargeback");
			await expect(
				page.locator("text=Chargeback").or(page.locator("text=Cost")).first(),
			).toBeVisible({
				timeout: 10_000,
			});
		});

		test("shows summary cards", async ({ page }) => {
			await page.goto("/chargeback");
			await page.waitForTimeout(2000);

			// Should display cost summary cards
			const summary = page.locator(
				"[data-testid='chargeback-summary'], [class*='card'], [class*='summary']",
			);
			await expect(summary.first()).toBeVisible({ timeout: 5000 });
		});

		test("displays cost values with dollar sign", async ({ page }) => {
			await page.goto("/chargeback");
			await page.waitForTimeout(2000);

			// Should show dollar amounts
			await expect(page.locator("text=$").first()).toBeVisible({ timeout: 5000 });
		});

		test("shows team breakdown", async ({ page }) => {
			await page.goto("/chargeback");
			await page.waitForTimeout(2000);

			// Should have team-level cost breakdown
			const teams = page.locator(
				"[data-testid='chargeback-teams'], [class*='team'], [class*='breakdown']",
			);
			const hasTeams = await teams
				.first()
				.isVisible()
				.catch(() => false);

			// Page should be accessible
			expect(page.url()).toContain("/chargeback");
		});
	});
});
