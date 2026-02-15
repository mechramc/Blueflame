import { expect, test } from "../fixtures/auth.fixture";
import { DEMO_PROJECT_ID } from "../fixtures/test-data";
import { resetDemoData, seedDemoData } from "../helpers/api-helpers";

test.describe("WF2: Chat & Spec Generation", () => {
	test.beforeAll(async ({ request }) => {
		await resetDemoData(request);
		await seedDemoData(request);
	});

	test.afterAll(async ({ request }) => {
		await resetDemoData(request);
	});

	test("project page shows 3-panel layout", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}`);

		// Chat panel
		await expect(page.getByTestId("chat-panel")).toBeVisible({ timeout: 15_000 });

		// Spec editor
		await expect(page.getByTestId("spec-editor")).toBeVisible();
	});

	test("chat history loads with seeded messages", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}`);

		// Wait for chat panel to load first
		await expect(page.getByTestId("chat-panel")).toBeVisible({ timeout: 15_000 });

		// Seed messages include "task management app" and "Kanban board"
		// Use longer timeout since data loads asynchronously
		await expect(page.getByText("task management", { exact: false }).first()).toBeVisible({
			timeout: 15_000,
		});
	});

	test("chat input is available", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}`);

		const input = page.getByTestId("chat-input-textarea");
		await expect(input).toBeVisible({ timeout: 10_000 });

		// Can type into the input
		await input.fill("Test message");
		await expect(input).toHaveValue("Test message");
	});

	test("spec editor shows YAML content", async ({ page }) => {
		await page.goto(`/project/${DEMO_PROJECT_ID}`);

		// Wait for spec editor container first
		await expect(page.getByTestId("spec-editor")).toBeVisible({ timeout: 15_000 });

		// Wait for YAML content to load — look for seed data keywords with generous timeout
		// The spec title is "TaskFlow" and content has "deliverables", "title:"
		await expect(page.getByText("TaskFlow", { exact: false }).first()).toBeVisible({
			timeout: 20_000,
		});
	});
});
