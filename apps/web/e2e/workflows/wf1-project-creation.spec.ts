import { expect, test } from "../fixtures/auth.fixture";
import { API_BASE } from "../fixtures/test-data";
import { resetDemoData } from "../helpers/api-helpers";

test.describe("WF1: Project Creation", () => {
	test.afterAll(async ({ request }) => {
		await resetDemoData(request);
	});

	test("home page loads with Blueflame branding", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("text=Blueflame")).toBeVisible();
	});

	test("can open new project dialog", async ({ page }) => {
		await page.goto("/");
		await page.click("text=New Project");
		await expect(page.getByTestId("create-project-dialog")).toBeVisible();
		await expect(page.getByTestId("project-name-input")).toBeVisible();
	});

	test("can create a new project", async ({ page }) => {
		await page.goto("/");
		await page.click("text=New Project");

		await page.getByTestId("project-name-input").fill("E2E Test Project");
		const descInput = page.locator("#project-desc, [name='description'], textarea");
		if (await descInput.count()) {
			await descInput.first().fill("Created by Playwright E2E tests");
		}

		await page.getByTestId("create-project-submit-button").click();

		// Should navigate to the project page
		await page.waitForURL(/\/project\/.+/, { timeout: 10_000 });
		await expect(page.locator("text=E2E Test Project")).toBeVisible();
	});

	test("new project appears in project list", async ({ page }) => {
		// Create a project via API first
		const res = await page.request.post(`${API_BASE}/api/projects`, {
			data: {
				name: "API-Created Project",
				description: "Created via API for E2E test",
			},
		});
		expect(res.ok()).toBeTruthy();

		await page.goto("/");
		await expect(page.locator("text=API-Created Project")).toBeVisible();
	});
});
