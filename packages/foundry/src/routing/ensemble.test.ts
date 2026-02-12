import { describe, expect, it, vi } from "vitest";

import { EnsembleStrategy, runEnsemble } from "./ensemble.js";
import type { ChatResponse, FoundryModelClient } from "./types.js";

function makeClient(content: string, model: string): FoundryModelClient {
	return {
		chat: vi.fn().mockResolvedValue({
			content,
			inputTokens: 10,
			outputTokens: 20,
			model,
		} satisfies ChatResponse),
	};
}

describe("runEnsemble", () => {
	it("should run all clients in parallel", async () => {
		const clients = [
			makeClient("hello from gpt", "gpt-4o"),
			makeClient("hello from claude", "claude-sonnet-4-5"),
			makeClient("hello from gemini", "gemini-2.5-pro"),
		];

		const result = await runEnsemble(
			clients,
			[{ role: "user", content: "test" }],
			EnsembleStrategy.MajorityVote,
		);

		expect(result.responses).toHaveLength(3);
		expect(result.models).toEqual(["gpt-4o", "claude-sonnet-4-5", "gemini-2.5-pro"]);
	});

	it("should sum tokens across all models", async () => {
		const clients = [makeClient("a", "m1"), makeClient("b", "m2")];

		const result = await runEnsemble(
			clients,
			[{ role: "user", content: "test" }],
			EnsembleStrategy.MajorityVote,
		);

		expect(result.totalInputTokens).toBe(20);
		expect(result.totalOutputTokens).toBe(40);
	});

	it("should use majority vote strategy", async () => {
		const clients = [
			makeClient("the answer is 42", "m1"),
			makeClient("the answer is 42", "m2"),
			makeClient("something completely different here", "m3"),
		];

		const result = await runEnsemble(
			clients,
			[{ role: "user", content: "test" }],
			EnsembleStrategy.MajorityVote,
		);

		expect(result.strategy).toBe(EnsembleStrategy.MajorityVote);
		expect(result.result.content).toBe("the answer is 42");
	});

	it("should use union strategy for test generation", async () => {
		const clients = [
			makeClient("test case A\n\ntest case B", "m1"),
			makeClient("test case B\n\ntest case C", "m2"),
		];

		const result = await runEnsemble(
			clients,
			[{ role: "user", content: "test" }],
			EnsembleStrategy.Union,
		);

		expect(result.strategy).toBe(EnsembleStrategy.Union);
		expect(result.result.content).toContain("test case A");
		expect(result.result.content).toContain("test case B");
		expect(result.result.content).toContain("test case C");
		expect(result.result.model).toContain("ensemble(");
	});

	it("should throw for empty clients array", async () => {
		await expect(
			runEnsemble([], [{ role: "user", content: "test" }], EnsembleStrategy.MajorityVote),
		).rejects.toThrow("Ensemble requires at least one client");
	});

	it("should work with single client", async () => {
		const clients = [makeClient("solo response", "m1")];

		const result = await runEnsemble(
			clients,
			[{ role: "user", content: "test" }],
			EnsembleStrategy.MajorityVote,
		);

		expect(result.result.content).toBe("solo response");
	});
});
