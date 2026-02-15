import { expect, test } from "../fixtures/auth.fixture";
import { setupAIMocks } from "../fixtures/mock-ai";
import { DEMO_PROJECT_ID } from "../fixtures/test-data";
import { resetDemoData, seedDemoData } from "../helpers/api-helpers";

test.describe("WF3: Spec to Execution", () => {
	test.beforeAll(async ({ request }) => {
		await seedDemoData(request);
	});

	test.afterAll(async ({ request }) => {
		await resetDemoData(request);
	});

	test("spec shows Draft status with Accept button", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}`);
		await page.waitForTimeout(2000);

		// Spec should be in DRAFT status
		await expect(page.locator("text=Draft").or(page.locator("text=DRAFT"))).toBeVisible({
			timeout: 10_000,
		});

		// Accept button should be visible
		await expect(
			page.getByTestId("spec-actions-accept-button").or(page.locator("button:has-text('Accept')")),
		).toBeVisible();
	});

	test("can accept a spec", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}`);
		await page.waitForTimeout(2000);

		const acceptBtn = page
			.getByTestId("spec-actions-accept-button")
			.or(page.locator("button:has-text('Accept')"));
		await acceptBtn.click();

		// Status should change to Accepted
		await expect(page.locator("text=Accepted").or(page.locator("text=ACCEPTED"))).toBeVisible({
			timeout: 10_000,
		});

		// Freeze button should now be visible
		await expect(
			page.getByTestId("spec-actions-freeze-button").or(page.locator("button:has-text('Freeze')")),
		).toBeVisible();
	});

	test("can freeze an accepted spec", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}`);
		await page.waitForTimeout(2000);

		// Accept first if still in Draft
		const acceptBtn = page
			.getByTestId("spec-actions-accept-button")
			.or(page.locator("button:has-text('Accept')"));
		if (await acceptBtn.isVisible().catch(() => false)) {
			await acceptBtn.click();
			await page.waitForTimeout(1000);
		}

		const freezeBtn = page
			.getByTestId("spec-actions-freeze-button")
			.or(page.locator("button:has-text('Freeze')"));
		await freezeBtn.click();

		// Status should change to Frozen
		await expect(page.locator("text=Frozen").or(page.locator("text=FROZEN"))).toBeVisible({
			timeout: 10_000,
		});

		// Generate Plan button should appear
		await expect(
			page
				.getByTestId("spec-actions-generate-plan-button")
				.or(page.locator("button:has-text('Generate Plan')")),
		).toBeVisible();
	});

	test("can generate a plan from frozen spec", async ({ page }) => {
		await setupAIMocks(page);
		await page.goto(`/project/${DEMO_PROJECT_ID}`);
		await page.waitForTimeout(2000);

		// Walk through Accept → Freeze if needed
		const acceptBtn = page
			.getByTestId("spec-actions-accept-button")
			.or(page.locator("button:has-text('Accept')"));
		if (await acceptBtn.isVisible().catch(() => false)) {
			await acceptBtn.click();
			await page.waitForTimeout(1000);
		}

		const freezeBtn = page
			.getByTestId("spec-actions-freeze-button")
			.or(page.locator("button:has-text('Freeze')"));
		if (await freezeBtn.isVisible().catch(() => false)) {
			await freezeBtn.click();
			await page.waitForTimeout(1000);
		}

		const genPlanBtn = page
			.getByTestId("spec-actions-generate-plan-button")
			.or(page.locator("button:has-text('Generate Plan')"));
		await expect(genPlanBtn).toBeVisible({ timeout: 5000 });
		await genPlanBtn.click();

		// Should show loading then plan ready state
		await expect(
			page
				.getByTestId("spec-actions-approve-lock-button")
				.or(page.locator("button:has-text('Approve')")),
		).toBeVisible({ timeout: 30_000 });
	});

	test("can approve, lock, and start execution", async ({ page }) => {
		await setupAIMocks(page);
		await page.goto(`/project/${DEMO_PROJECT_ID}`);
		await page.waitForTimeout(2000);

		// Walk through the full workflow if needed
		const acceptBtn = page
			.getByTestId("spec-actions-accept-button")
			.or(page.locator("button:has-text('Accept')"));
		if (await acceptBtn.isVisible().catch(() => false)) {
			await acceptBtn.click();
			await page.waitForTimeout(1000);
		}

		const freezeBtn = page
			.getByTestId("spec-actions-freeze-button")
			.or(page.locator("button:has-text('Freeze')"));
		if (await freezeBtn.isVisible().catch(() => false)) {
			await freezeBtn.click();
			await page.waitForTimeout(1000);
		}

		const genPlanBtn = page
			.getByTestId("spec-actions-generate-plan-button")
			.or(page.locator("button:has-text('Generate Plan')"));
		if (await genPlanBtn.isVisible().catch(() => false)) {
			await genPlanBtn.click();
			await page.waitForTimeout(5000);
		}

		// Approve & Lock
		const approveBtn = page
			.getByTestId("spec-actions-approve-lock-button")
			.or(page.locator("button:has-text('Approve')"));
		await expect(approveBtn).toBeVisible({ timeout: 30_000 });
		await approveBtn.click();
		await page.waitForTimeout(2000);

		// Start Execution
		const execBtn = page
			.getByTestId("spec-actions-start-execution-button")
			.or(page.locator("button:has-text('Start Execution')"));
		await expect(execBtn).toBeVisible({ timeout: 15_000 });
		await execBtn.click();

		// Should navigate to run page
		await page.waitForURL(/\/run\//, { timeout: 15_000 });
	});
});
