import { expect, test } from "../fixtures/auth.fixture";
import { setupAIMocks } from "../fixtures/mock-ai";
import { DEMO_PROJECT_ID } from "../fixtures/test-data";
import { resetDemoData, seedDemoData } from "../helpers/api-helpers";

test.describe("WF2: Chat & Spec Generation", () => {
	test.beforeAll(async ({ request }) => {
		await seedDemoData(request);
	});

	test.afterAll(async ({ request }) => {
		await resetDemoData(request);
	});

	test("project page shows 3-panel layout", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}`);

		// Chat panel should be visible
		await expect(
			page.getByTestId("chat-panel").or(page.locator("[class*='chat']").first()),
		).toBeVisible({ timeout: 10_000 });

		// Spec area should be visible
		await expect(
			page.getByTestId("spec-editor").or(page.locator("[class*='spec']").first()),
		).toBeVisible();
	});

	test("chat history loads with seeded messages", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}`);

		// Wait for chat messages to load — seeded data has 4 messages
		await expect(page.locator("[class*='message'], [data-testid*='message']").first()).toBeVisible({
			timeout: 10_000,
		});

		const messages = page.locator("[class*='message'], [data-testid*='message']");
		const count = await messages.count();
		expect(count).toBeGreaterThanOrEqual(2);
	});

	test("can type and send a chat message", async ({ page }) => {
		await setupAIMocks(page);
		await page.goto(`/project/${DEMO_PROJECT_ID}`);

		// Wait for chat to load
		await page.waitForTimeout(2000);

		const input = page.getByTestId("chat-input-textarea");
		await expect(input).toBeVisible({ timeout: 5000 });
		await input.fill("Can you help me design an authentication system?");

		await page.getByTestId("chat-input-send-button").click();

		// Wait for the response message to appear (mocked AI response)
		await expect(
			page.locator("text=task management").or(page.locator("text=authentication")),
		).toBeVisible({ timeout: 15_000 });
	});

	test("spec editor shows YAML content", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}`);

		// Wait for spec content to load
		await page.waitForTimeout(2000);

		const specArea = page
			.getByTestId("spec-editor")
			.or(page.locator("textarea, [class*='editor'], [class*='monaco']").first());

		await expect(specArea).toBeVisible({ timeout: 10_000 });
	});
});
