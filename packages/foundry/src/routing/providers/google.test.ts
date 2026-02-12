import { describe, expect, it, vi } from "vitest";

import type { ProviderConfig } from "../types.js";
import { ProviderType } from "../types.js";

// Mock the google generative AI module
vi.mock("@google/generative-ai", () => {
	return {
		GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
			getGenerativeModel: vi.fn().mockReturnValue({
				generateContent: vi.fn().mockResolvedValue({
					response: {
						text: () => "Hello from Gemini",
						usageMetadata: {
							promptTokenCount: 12,
							candidatesTokenCount: 18,
						},
					},
				}),
			}),
		})),
	};
});

import { GoogleClient } from "./google.js";

const config: ProviderConfig = {
	provider: ProviderType.Google,
	model: "gemini-2.5-pro",
	endpoint: "https://generativelanguage.googleapis.com",
	apiKey: "test-key",
};

describe("GoogleClient", () => {
	it("should return chat response with content", async () => {
		const client = new GoogleClient(config);
		const response = await client.chat([
			{ role: "system", content: "You are helpful." },
			{ role: "user", content: "Hello" },
		]);

		expect(response.content).toBe("Hello from Gemini");
		expect(response.model).toBe("gemini-2.5-pro");
	});

	it("should return token counts", async () => {
		const client = new GoogleClient(config);
		const response = await client.chat([{ role: "user", content: "Hello" }]);

		expect(response.inputTokens).toBe(12);
		expect(response.outputTokens).toBe(18);
	});

	it("should handle system messages", async () => {
		const client = new GoogleClient(config);
		const response = await client.chat([
			{ role: "system", content: "System instruction" },
			{ role: "user", content: "Hello" },
		]);

		expect(response.content).toBe("Hello from Gemini");
	});
});
