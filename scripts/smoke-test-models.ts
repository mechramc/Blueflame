/**
 * Smoke test — ping every Azure AI model endpoint to confirm API connectivity.
 * Run: npx tsx scripts/smoke-test-models.ts
 */

import "dotenv/config";

const ENDPOINT = process.env.FOUNDRY_ENDPOINT ?? process.env.AZURE_OPENAI_ENDPOINT ?? "";
const API_KEY = process.env.FOUNDRY_API_KEY ?? process.env.AZURE_OPENAI_API_KEY ?? "";

// Strip /api/projects/* for the resource endpoint
const RESOURCE_ENDPOINT = ENDPOINT.replace(/\/api\/projects\/[^/]+\/?$/, "");

interface ModelTest {
	name: string;
	url: string;
	body: Record<string, unknown>;
	headers: Record<string, string>;
}

function buildTests(): ModelTest[] {
	const tests: ModelTest[] = [];
	const allModels = ["gpt-4o", "gpt-4o-mini", "o3-mini", "Phi-4", "Llama-3.3-70B-Instruct"];

	// Reasoning models that need max_completion_tokens instead of max_tokens
	const reasoningModels = new Set(["o3-mini"]);

	// Test 1: All models via /openai/v1/ (catalog-style, NO api-version)
	for (const model of allModels) {
		const tokenParam = reasoningModels.has(model)
			? { max_completion_tokens: 50 }
			: { max_tokens: 50 };
		const body: Record<string, unknown> = {
			model,
			messages: [
				{ role: "system", content: "Reply with exactly this json: {\"status\":\"ok\"}" },
				{ role: "user", content: "ping" },
			],
			...tokenParam,
			...(reasoningModels.has(model) ? {} : { temperature: 0 }),
		};

		tests.push({
			name: `${model} via /openai/v1`,
			url: `${RESOURCE_ENDPOINT}/openai/v1/chat/completions`,
			body,
			headers: { "Content-Type": "application/json", "api-key": API_KEY },
		});
	}

	// Test 2: GPT models with response_format via /openai/v1/
	for (const model of ["gpt-4o", "gpt-4o-mini"]) {
		tests.push({
			name: `${model} + json_format via /openai/v1`,
			url: `${RESOURCE_ENDPOINT}/openai/v1/chat/completions`,
			body: {
				model,
				messages: [
					{ role: "system", content: "Reply with valid json: {\"status\":\"ok\"}" },
					{ role: "user", content: "ping" },
				],
				max_tokens: 50,
				temperature: 0,
				response_format: { type: "json_object" },
			},
			headers: { "Content-Type": "application/json", "api-key": API_KEY },
		});
	}

	// Test 3: OpenAI deployment path (for comparison — expected to fail on AI Foundry)
	for (const model of ["gpt-4o"]) {
		tests.push({
			name: `${model} via /openai/deployments/ (legacy)`,
			url: `${ENDPOINT}/openai/deployments/${model}/chat/completions?api-version=2024-12-01-preview`,
			body: {
				model,
				messages: [
					{ role: "system", content: "Reply with exactly: {\"status\":\"ok\"}" },
					{ role: "user", content: "ping" },
				],
				max_tokens: 50,
				temperature: 0,
			},
			headers: { "Content-Type": "application/json", "api-key": API_KEY },
		});
	}

	return tests;
}

async function runTest(test: ModelTest): Promise<void> {
	const label = test.name.padEnd(50);
	try {
		const res = await fetch(test.url, {
			method: "POST",
			headers: test.headers,
			body: JSON.stringify(test.body),
		});

		if (!res.ok) {
			const errorBody = await res.text();
			console.log(`❌ ${label} HTTP ${res.status}: ${errorBody.slice(0, 200)}`);
			return;
		}

		const json = await res.json() as {
			choices?: Array<{ message?: { content?: string } }>;
			model?: string;
			usage?: { total_tokens?: number };
		};
		const content = json.choices?.[0]?.message?.content ?? "(empty)";
		const tokens = json.usage?.total_tokens ?? "?";
		const returnedModel = json.model ?? "?";
		console.log(`✅ ${label} model=${returnedModel} tokens=${tokens} response="${content.slice(0, 80)}"`);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.log(`❌ ${label} ERROR: ${msg.slice(0, 200)}`);
	}
}

async function main(): Promise<void> {
	console.log("=== Blueflame Model Smoke Test ===\n");
	console.log(`Foundry Endpoint: ${ENDPOINT}`);
	console.log(`Resource Endpoint: ${RESOURCE_ENDPOINT}`);
	console.log(`API Key: ***${API_KEY.slice(-4)}\n`);

	const tests = buildTests();
	for (const test of tests) {
		await runTest(test);
	}

	console.log("\n=== Done ===");
}

main().catch(console.error);
