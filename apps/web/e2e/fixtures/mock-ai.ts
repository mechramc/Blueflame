import type { Page } from "@playwright/test";

const CHAT_RESPONSE = {
	id: "chatcmpl-mock-1",
	object: "chat.completion",
	choices: [
		{
			index: 0,
			message: {
				role: "assistant",
				content:
					"Great idea! A task management app with real-time updates and Kanban views would be a solid project. I can help design the architecture with role-based access control and WebSocket-based live updates. Shall I generate a detailed spec?",
			},
			finish_reason: "stop",
		},
	],
	usage: { prompt_tokens: 100, completion_tokens: 60, total_tokens: 160 },
};

const SPEC_YAML = `title: TaskFlow — Real-time Task Management Platform
description: Full-stack task management app with real-time updates
definition_of_done: All acceptance criteria pass, CI green, deployed to staging
deliverables:
  - Kanban Board UI
  - Task CRUD API
  - Real-time WebSocket updates
acceptance_criteria:
  - Users can create, edit, and delete tasks
  - Drag-and-drop between columns updates status in real time
  - Role-based access control enforces permissions
`;

const PLAN_RESPONSE = {
	id: "chatcmpl-mock-plan",
	object: "chat.completion",
	choices: [
		{
			index: 0,
			message: {
				role: "assistant",
				content: JSON.stringify({
					tasks: [
						{
							id: "task-1",
							description: "Set up project structure with Next.js and Express",
							role: "BUILDER",
							sigma: 1,
							estimatedCost: 0.15,
							dependencies: [],
						},
						{
							id: "task-2",
							description: "Implement Kanban board UI with drag-and-drop",
							role: "BUILDER",
							sigma: 2,
							estimatedCost: 0.25,
							dependencies: ["task-1"],
						},
					],
				}),
			},
			finish_reason: "stop",
		},
	],
	usage: { prompt_tokens: 200, completion_tokens: 120, total_tokens: 320 },
};

/**
 * Intercept all outbound AI API calls at the network level.
 * This mocks the LLM responses so tests don't need real API keys.
 */
export async function setupAIMocks(page: Page) {
	// Mock Azure OpenAI
	await page.route("**/openai.azure.com/**/chat/completions", (route) => {
		const postData = route.request().postDataJSON();
		const lastMessage = postData?.messages?.[postData.messages.length - 1];
		const content = lastMessage?.content ?? "";

		// Return plan response if the prompt mentions planning
		if (content.toLowerCase().includes("plan")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(PLAN_RESPONSE),
			});
		}

		// Return spec YAML if the prompt mentions spec generation
		if (content.toLowerCase().includes("spec") || content.toLowerCase().includes("generate")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					...CHAT_RESPONSE,
					choices: [
						{
							index: 0,
							message: { role: "assistant", content: SPEC_YAML },
							finish_reason: "stop",
						},
					],
				}),
			});
		}

		// Default chat response
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(CHAT_RESPONSE),
		});
	});

	// Mock Anthropic API
	await page.route("**/api.anthropic.com/**", (route) => {
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				id: "msg-mock-1",
				type: "message",
				role: "assistant",
				content: [{ type: "text", text: CHAT_RESPONSE.choices[0].message.content }],
				stop_reason: "end_turn",
				usage: { input_tokens: 100, output_tokens: 60 },
			}),
		});
	});

	// Mock Google AI API
	await page.route("**/generativelanguage.googleapis.com/**", (route) => {
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				candidates: [
					{
						content: {
							parts: [{ text: CHAT_RESPONSE.choices[0].message.content }],
							role: "model",
						},
						finishReason: "STOP",
					},
				],
			}),
		});
	});
}
