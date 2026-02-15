import { expect, test } from "../fixtures/auth.fixture";
import { setupAIMocks } from "../fixtures/mock-ai";
import { API_BASE, DEMO_PROJECT_ID } from "../fixtures/test-data";
import { acceptSpec, freezeSpec, resetDemoData, seedDemoData } from "../helpers/api-helpers";

test.describe("WF5: SCR Workflow", () => {
	let specId: string;

	test.beforeAll(async ({ request }) => {
		await seedDemoData(request);

		// Accept and freeze the spec so SCR is available
		const specsRes = await request.get(`${API_BASE}/api/specs?projectId=${DEMO_PROJECT_ID}`);
		const specs = await specsRes.json();
		if (Array.isArray(specs) && specs.length > 0) {
			specId = specs[0].id;
			await acceptSpec(request, specId);
			await freezeSpec(request, specId);
		}
	});

	test.afterAll(async ({ request }) => {
		await resetDemoData(request);
	});

	test("frozen spec shows Frozen badge", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}`);
		await page.waitForTimeout(2000);

		await expect(page.locator("text=Frozen").or(page.locator("text=FROZEN"))).toBeVisible({
			timeout: 10_000,
		});
	});

	test("can open SCR panel to edit frozen spec", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}`);
		await page.waitForTimeout(2000);

		// Look for the SCR / Edit Frozen Spec button
		const scrTrigger = page.locator(
			"button:has-text('Request Change'), button:has-text('Edit Frozen'), button:has-text('SCR')",
		);
		await expect(scrTrigger.first()).toBeVisible({ timeout: 10_000 });
		await scrTrigger.first().click();

		// SCR panel should open
		await expect(
			page.getByTestId("scr-panel").or(page.locator("[class*='scr']").first()),
		).toBeVisible({ timeout: 5000 });
	});

	test("SCR panel has reason input and YAML editor", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}`);
		await page.waitForTimeout(2000);

		const scrTrigger = page.locator(
			"button:has-text('Request Change'), button:has-text('Edit Frozen'), button:has-text('SCR')",
		);
		await scrTrigger.first().click();

		// Check for reason input
		await expect(
			page.getByTestId("scr-reason-input").or(page.locator("input[placeholder*='Why']")),
		).toBeVisible({ timeout: 5000 });

		// Check for YAML editor
		await expect(
			page.getByTestId("scr-yaml-editor").or(page.locator("textarea").last()),
		).toBeVisible();
	});

	test("can submit an SCR with reason and modified YAML", async ({ page }) => {
		await setupAIMocks(page);
		await page.goto(`/project/${DEMO_PROJECT_ID}`);
		await page.waitForTimeout(2000);

		const scrTrigger = page.locator(
			"button:has-text('Request Change'), button:has-text('Edit Frozen'), button:has-text('SCR')",
		);
		await scrTrigger.first().click();
		await page.waitForTimeout(1000);

		// Fill reason
		const reasonInput = page
			.getByTestId("scr-reason-input")
			.or(page.locator("input[placeholder*='Why']"));
		await reasonInput.fill("Adding WebSocket real-time feature");

		// Modify YAML
		const yamlEditor = page.getByTestId("scr-yaml-editor").or(page.locator("textarea").last());
		const currentContent = await yamlEditor.inputValue();
		await yamlEditor.fill(`${currentContent}\n  - WebSocket real-time sync`);

		// Submit
		const submitBtn = page
			.getByTestId("scr-submit-button")
			.or(page.locator("button:has-text('Submit SCR'), button:has-text('Submit')"));
		await submitBtn.click();

		// Should transition to review state
		await expect(
			page
				.getByTestId("scr-approve-button")
				.or(page.locator("button:has-text('Approve')"))
				.or(page.locator("text=Review")),
		).toBeVisible({ timeout: 15_000 });
	});
});
