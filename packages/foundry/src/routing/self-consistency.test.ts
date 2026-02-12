import { describe, expect, it, vi } from "vitest";

import { computeVariance, runSelfConsistency, selectByMajorityVote } from "./self-consistency.js";
import type { ChatResponse, FoundryModelClient } from "./types.js";

function mockClient(responses: string[]): FoundryModelClient {
	let callIndex = 0;
	return {
		chat: vi.fn().mockImplementation(async () => {
			const content = responses[callIndex % responses.length] ?? "";
			callIndex++;
			return {
				content,
				inputTokens: 10,
				outputTokens: 20,
				model: "test-model",
			} satisfies ChatResponse;
		}),
	};
}

describe("computeVariance", () => {
	it("should return 0 for identical responses", () => {
		const variance = computeVariance(["hello world", "hello world", "hello world"]);
		expect(variance).toBe(0);
	});

	it("should return 0 for single response", () => {
		expect(computeVariance(["hello"])).toBe(0);
	});

	it("should return 0 for empty array", () => {
		expect(computeVariance([])).toBe(0);
	});

	it("should return high variance for completely different responses", () => {
		const variance = computeVariance([
			"apple banana cherry",
			"dog elephant frog",
			"xray yankee zebra",
		]);
		expect(variance).toBeGreaterThan(0.8);
	});

	it("should return low variance for similar responses", () => {
		const variance = computeVariance([
			"the function returns a number",
			"the function returns a value",
			"the function returns a number type",
		]);
		expect(variance).toBeLessThan(0.5);
	});
});

describe("selectByMajorityVote", () => {
	it("should return the most similar response", () => {
		const responses: ChatResponse[] = [
			{ content: "hello world foo", inputTokens: 5, outputTokens: 10, model: "a" },
			{ content: "hello world bar", inputTokens: 5, outputTokens: 10, model: "b" },
			{
				content: "completely different thing entirely",
				inputTokens: 5,
				outputTokens: 10,
				model: "c",
			},
		];
		const selected = selectByMajorityVote(responses);
		// "hello world foo" and "hello world bar" are more similar to each other
		// than to "completely different thing entirely"
		expect(selected.content).toMatch(/hello world/);
	});

	it("should return the single response when only one", () => {
		const responses: ChatResponse[] = [
			{ content: "only one", inputTokens: 5, outputTokens: 10, model: "a" },
		];
		expect(selectByMajorityVote(responses).content).toBe("only one");
	});

	it("should throw for empty responses", () => {
		expect(() => selectByMajorityVote([])).toThrow("Cannot select from empty responses");
	});
});

describe("runSelfConsistency", () => {
	it("should run N parallel completions", async () => {
		const client = mockClient(["response a", "response a", "response a"]);
		const result = await runSelfConsistency(
			client,
			[{ role: "user", content: "test" }],
			undefined,
			{ n: 3 },
		);

		expect(result.responses).toHaveLength(3);
		expect(client.chat).toHaveBeenCalledTimes(3);
	});

	it("should compute variance across responses", async () => {
		const client = mockClient(["same response", "same response", "same response"]);
		const result = await runSelfConsistency(
			client,
			[{ role: "user", content: "test" }],
			undefined,
			{ n: 3 },
		);

		expect(result.variance).toBe(0);
		expect(result.escalated).toBe(false);
	});

	it("should mark as escalated when variance exceeds threshold", async () => {
		const client = mockClient(["apple banana cherry", "dog elephant frog", "xray yankee zebra"]);
		const result = await runSelfConsistency(
			client,
			[{ role: "user", content: "test" }],
			undefined,
			{
				n: 3,
				escalationThreshold: 0.5,
			},
		);

		expect(result.escalated).toBe(true);
	});

	it("should sum token counts across all samples", async () => {
		const client = mockClient(["a", "b", "c"]);
		const result = await runSelfConsistency(
			client,
			[{ role: "user", content: "test" }],
			undefined,
			{ n: 3 },
		);

		expect(result.totalInputTokens).toBe(30); // 10 * 3
		expect(result.totalOutputTokens).toBe(60); // 20 * 3
	});

	it("should use temperature 0.7 by default for diversity", async () => {
		const client = mockClient(["a"]);
		await runSelfConsistency(client, [{ role: "user", content: "test" }], undefined, { n: 1 });

		expect(client.chat).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ temperature: 0.7 }),
		);
	});

	it("should respect custom temperature", async () => {
		const client = mockClient(["a"]);
		await runSelfConsistency(
			client,
			[{ role: "user", content: "test" }],
			{ temperature: 0.9 },
			{ n: 1 },
		);

		expect(client.chat).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ temperature: 0.9 }),
		);
	});
});
