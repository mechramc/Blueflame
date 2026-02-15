import { test as base, expect } from "@playwright/test";

/**
 * Custom test fixture that sets dev-mode auth before each page navigation.
 * All workflow specs should import { test, expect } from this file.
 */
export const test = base.extend({
	page: async ({ page }, use) => {
		await page.addInitScript(() => {
			localStorage.setItem("bf-dev-role", "Blueflame_Admin");
		});
		await use(page);
	},
});

export { expect };
