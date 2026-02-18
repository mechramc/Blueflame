import { describe, expect, it, vi } from "vitest";

import type { ProviderConfig } from "../types.js";
import { ProviderType } from "../types.js";

// Mock the openai module
vi.mock("openai", () => {
	return {
		default: vi.fn().mockImplementation(() => ({
			chat: {
				completions: {
					create: vi.fn().mockResolvedValue({
						choices: [{ message: { content: "Hello from Azure" } }],
						usage: { prompt_tokens: 10, completion_tokens: 20 },
						model: "gpt-4o",
					}),
				},
			},
		})),
	};
});

import { AzureOpenAIClient } from "./azure-openai.js";

const config: ProviderConfig = {
	provider: ProviderType.AzureOpenAI,
	model: "gpt-4o",
	endpoint: "https://my-resource.openai.azure.com",
	apiKey: "test-key",
	apiVersion: "2024-12-01-preview",
};

describe("AzureOpenAIClient", () => {
	it("should return chat response with content", async () => {
		const client = new AzureOpenAIClient(config);
		const response = await client.chat([
			{ role: "system", content: "You are helpful." },
			{ role: "user", content: "Hello" },
		]);

		expect(response.content).toBe("Hello from Azure");
		expect(response.model).toBe("gpt-4o");
	});

	it("should return token counts", async () => {
		const client = new AzureOpenAIClient(config);
		const response = await client.chat([{ role: "user", content: "Hello" }]);

		expect(response.inputTokens).toBe(10);
		expect(response.outputTokens).toBe(20);
	});

	it("should pass temperature and maxTokens options", async () => {
		const client = new AzureOpenAIClient(config);
		const response = await client.chat([{ role: "user", content: "Hello" }], {
			temperature: 0.5,
			maxTokens: 100,
		});

		expect(response.content).toBe("Hello from Azure");
	});
});
