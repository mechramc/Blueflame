import { expect, test } from "../fixtures/auth.fixture";
import { DEMO_PROJECT_ID } from "../fixtures/test-data";
import {
	acceptSpec,
	freezeSpec,
	getLatestSpec,
	resetDemoData,
	seedDemoData,
} from "../helpers/api-helpers";

test.describe("WF5: SCR Workflow", () => {
	test.beforeAll(async ({ request }) => {
		// Fresh seed — don't rely on state from other suites
		await resetDemoData(request);
		await seedDemoData(request);

		// Wait a moment for seed data to settle
		await new Promise((r) => setTimeout(r, 1000));

		// Accept and freeze the spec so SCR is available
		const spec = await getLatestSpec(request, DEMO_PROJECT_ID);

		if (spec) {
			try {
				await acceptSpec(request, spec.id);
			} catch {
				// May already be accepted
			}
			try {
				await freezeSpec(request, spec.id);
			} catch {
				// May already be frozen
			}
		}
	});

	test.afterAll(async ({ request }) => {
		await resetDemoData(request);
	});

	test("frozen spec shows Frozen badge", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}`);

		// Wait for spec editor to load
		await expect(page.getByTestId("spec-editor")).toBeVisible({ timeout: 15_000 });

		await expect(page.getByText("Frozen", { exact: false }).first()).toBeVisible({
			timeout: 15_000,
		});
	});

	test("can open SCR panel to edit frozen spec", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}`);
		await expect(page.getByTestId("spec-editor")).toBeVisible({ timeout: 15_000 });
		await page.waitForTimeout(2000);

		// Look for the SCR / Edit Frozen Spec / Request Change button
		const scrTrigger = page.locator(
			"button:has-text('Request Change'), button:has-text('Edit Frozen'), button:has-text('SCR')",
		);
		await expect(scrTrigger.first()).toBeVisible({ timeout: 10_000 });
		await scrTrigger.first().click();

		// SCR panel should open
		await expect(page.getByTestId("scr-panel")).toBeVisible({ timeout: 5000 });
	});

	test("SCR panel has reason input and YAML editor", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}`);
		await expect(page.getByTestId("spec-editor")).toBeVisible({ timeout: 15_000 });
		await page.waitForTimeout(2000);

		const scrTrigger = page.locator(
			"button:has-text('Request Change'), button:has-text('Edit Frozen'), button:has-text('SCR')",
		);
		await scrTrigger.first().click();

		// Click "Edit Frozen Spec" button inside SCR panel
		const editBtn = page.locator("button:has-text('Edit Frozen Spec')");
		if (await editBtn.isVisible().catch(() => false)) {
			await editBtn.click();
			await page.waitForTimeout(500);
		}

		// Check for reason input
		await expect(page.getByTestId("scr-reason-input")).toBeVisible({ timeout: 5000 });

		// Check for YAML editor
		await expect(page.getByTestId("scr-yaml-editor")).toBeVisible();
	});

	test("can fill SCR form with reason and modified YAML", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}`);
		await expect(page.getByTestId("spec-editor")).toBeVisible({ timeout: 15_000 });
		await page.waitForTimeout(2000);

		const scrTrigger = page.locator(
			"button:has-text('Request Change'), button:has-text('Edit Frozen'), button:has-text('SCR')",
		);
		await scrTrigger.first().click();

		// Click "Edit Frozen Spec" if needed
		const editBtn = page.locator("button:has-text('Edit Frozen Spec')");
		if (await editBtn.isVisible().catch(() => false)) {
			await editBtn.click();
			await page.waitForTimeout(500);
		}

		// Fill reason
		const reasonInput = page.getByTestId("scr-reason-input");
		await expect(reasonInput).toBeVisible({ timeout: 5_000 });
		await reasonInput.fill("Adding WebSocket real-time feature");
		await expect(reasonInput).toHaveValue("Adding WebSocket real-time feature");

		// Modify YAML
		const yamlEditor = page.getByTestId("scr-yaml-editor");
		const currentContent = await yamlEditor.inputValue();
		await yamlEditor.fill(`${currentContent}\n  - WebSocket real-time sync`);

		// Submit button should be visible
		await expect(page.getByTestId("scr-submit-button")).toBeVisible();
	});
});
