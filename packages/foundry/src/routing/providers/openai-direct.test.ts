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
						choices: [{ message: { content: "Hello from OpenAI Direct" } }],
						usage: { prompt_tokens: 8, completion_tokens: 16 },
						model: "gpt-4o",
					}),
				},
			},
		})),
	};
});

import { OpenAIDirectClient } from "./openai-direct.js";

const config: ProviderConfig = {
	provider: ProviderType.OpenAIDirect,
	model: "gpt-4o",
	endpoint: "https://api.openai.com",
	apiKey: "test-key",
};

describe("OpenAIDirectClient", () => {
	it("should return chat response with content", async () => {
		const client = new OpenAIDirectClient(config);
		const response = await client.chat([
			{ role: "system", content: "You are helpful." },
			{ role: "user", content: "Hello" },
		]);

		expect(response.content).toBe("Hello from OpenAI Direct");
		expect(response.model).toBe("gpt-4o");
	});

	it("should return token counts", async () => {
		const client = new OpenAIDirectClient(config);
		const response = await client.chat([{ role: "user", content: "Hello" }]);

		expect(response.inputTokens).toBe(8);
		expect(response.outputTokens).toBe(16);
	});

	it("should pass options through", async () => {
		const client = new OpenAIDirectClient(config);
		const response = await client.chat([{ role: "user", content: "Hello" }], {
			temperature: 0.7,
			maxTokens: 200,
		});

		expect(response.content).toBe("Hello from OpenAI Direct");
	});
});
