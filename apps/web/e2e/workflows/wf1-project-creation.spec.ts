import { expect, test } from "../fixtures/auth.fixture";
import { API_BASE } from "../fixtures/test-data";
import { resetDemoData } from "../helpers/api-helpers";

test.describe("WF1: Project Creation", () => {
	test.beforeAll(async ({ request }) => {
		await resetDemoData(request);
	});

	test.afterAll(async ({ request }) => {
		await resetDemoData(request);
	});

	test("home page loads with Blueflame branding", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByRole("heading", { name: "Blueflame" })).toBeVisible({
			timeout: 10_000,
		});
	});

	test("can open new project dialog", async ({ page }) => {
		await page.goto("/");
		await page.click("text=New Project");
		await expect(page.getByTestId("create-project-dialog")).toBeVisible();
		await expect(page.getByTestId("project-name-input")).toBeVisible();
	});

	test("can create a new project", async ({ page }) => {
		// Use a unique project name to avoid collisions with prior runs
		const projectName = `E2E Test ${Date.now()}`;
		await page.goto("/");
		await page.click("text=New Project");

		await page.getByTestId("project-name-input").fill(projectName);
		const descInput = page.locator("#project-desc");
		if ((await descInput.count()) > 0) {
			await descInput.fill("Created by Playwright E2E tests");
		}

		await page.getByTestId("create-project-submit-button").click();

		// Dialog closes and project appears in the list (no navigation)
		await expect(page.getByTestId("create-project-dialog")).toBeHidden({ timeout: 10_000 });
		await expect(page.locator(`text=${projectName}`)).toBeVisible({ timeout: 10_000 });
	});

	test("new project appears in project list", async ({ page }) => {
		const projectName = `API-Created ${Date.now()}`;
		const res = await page.request.post(`${API_BASE}/api/projects`, {
			data: {
				name: projectName,
				description: "Created via API for E2E test",
			},
		});
		expect(res.ok()).toBeTruthy();

		await page.goto("/");
		await expect(page.locator(`text=${projectName}`)).toBeVisible({ timeout: 10_000 });
	});
});
