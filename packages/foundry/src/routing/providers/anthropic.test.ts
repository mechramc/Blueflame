import { describe, expect, it, vi } from "vitest";

import type { ProviderConfig } from "../types.js";
import { ProviderType } from "../types.js";

// Mock the anthropic module
vi.mock("@anthropic-ai/sdk", () => {
	return {
		default: vi.fn().mockImplementation(() => ({
			messages: {
				create: vi.fn().mockResolvedValue({
					content: [{ type: "text", text: "Hello from Claude" }],
					usage: { input_tokens: 15, output_tokens: 25 },
					model: "claude-sonnet-4-5",
				}),
			},
		})),
	};
});

import { AnthropicClient } from "./anthropic.js";

const config: ProviderConfig = {
	provider: ProviderType.Anthropic,
	model: "claude-sonnet-4-5",
	endpoint: "https://api.anthropic.com",
	apiKey: "test-key",
};

describe("AnthropicClient", () => {
	it("should return chat response with content", async () => {
		const client = new AnthropicClient(config);
		const response = await client.chat([
			{ role: "system", content: "You are helpful." },
			{ role: "user", content: "Hello" },
		]);

		expect(response.content).toBe("Hello from Claude");
		expect(response.model).toBe("claude-sonnet-4-5");
	});

	it("should return token counts", async () => {
		const client = new AnthropicClient(config);
		const response = await client.chat([{ role: "user", content: "Hello" }]);

		expect(response.inputTokens).toBe(15);
		expect(response.outputTokens).toBe(25);
	});

	it("should extract system message separately", async () => {
		const client = new AnthropicClient(config);
		// This verifies the client doesn't crash with system messages
		const response = await client.chat([
			{ role: "system", content: "System instruction" },
			{ role: "user", content: "Hello" },
		]);

		expect(response.content).toBe("Hello from Claude");
	});

	it("should handle messages without system message", async () => {
		const client = new AnthropicClient(config);
		const response = await client.chat([{ role: "user", content: "Hello" }]);

		expect(response.content).toBe("Hello from Claude");
	});
});
