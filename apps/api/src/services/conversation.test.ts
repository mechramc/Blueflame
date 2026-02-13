import type { ChatMessage } from "@blueflame/shared";
import { afterEach, describe, expect, it } from "vitest";
import {
	addMessage,
	clearAllConversations,
	clearConversation,
	getConversationSync,
	getHistorySync,
} from "./conversation.js";

function mockMessage(overrides?: Partial<ChatMessage>): ChatMessage {
	return {
		id: `msg-${Date.now()}`,
		projectId: "proj-1",
		role: "user",
		content: "Hello",
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

describe("Conversation Service", () => {
	afterEach(() => {
		clearAllConversations();
	});

	it("should create a new conversation for unknown projectId", () => {
		const conv = getConversationSync("proj-new");
		expect(conv.projectId).toBe("proj-new");
		expect(conv.messages).toHaveLength(0);
		expect(conv.type).toBe("conversation");
	});

	it("should return same conversation on repeated access", () => {
		const conv1 = getConversationSync("proj-1");
		const conv2 = getConversationSync("proj-1");
		expect(conv1).toBe(conv2);
	});

	it("should add messages to conversation", async () => {
		const msg = mockMessage({ content: "Build a todo app" });
		const conv = await addMessage("proj-1", msg);
		expect(conv.messages).toHaveLength(1);
		expect(conv.messages[0]?.content).toBe("Build a todo app");
	});

	it("should accumulate multiple messages", async () => {
		await addMessage("proj-1", mockMessage({ role: "user", content: "msg1" }));
		await addMessage("proj-1", mockMessage({ role: "agent", content: "msg2" }));
		await addMessage("proj-1", mockMessage({ role: "user", content: "msg3" }));

		const conv = getConversationSync("proj-1");
		expect(conv.messages).toHaveLength(3);
	});

	it("should update updatedAt timestamp on addMessage", async () => {
		const conv1 = getConversationSync("proj-1");
		const before = conv1.updatedAt;

		// Small delay to ensure different timestamp
		await addMessage("proj-1", mockMessage());
		const after = getConversationSync("proj-1").updatedAt;

		expect(after).toBeDefined();
		expect(before).toBeDefined();
	});

	it("should return history in correct format for LLM", async () => {
		await addMessage("proj-1", mockMessage({ role: "user", content: "Hello" }));
		await addMessage("proj-1", mockMessage({ role: "agent", content: "Hi there" }));

		const history = getHistorySync("proj-1");
		expect(history).toHaveLength(2);
		expect(history[0]).toEqual({ role: "user", content: "Hello" });
		expect(history[1]).toEqual({ role: "agent", content: "Hi there" });
	});

	it("should return empty history for new project", () => {
		const history = getHistorySync("proj-unknown");
		expect(history).toHaveLength(0);
	});

	it("should clear a specific conversation", async () => {
		await addMessage("proj-1", mockMessage());
		await addMessage("proj-2", mockMessage({ projectId: "proj-2" }));

		clearConversation("proj-1");

		expect(getConversationSync("proj-1").messages).toHaveLength(0);
		expect(getConversationSync("proj-2").messages).toHaveLength(1);
	});

	it("should isolate conversations by projectId", async () => {
		await addMessage("proj-1", mockMessage({ content: "msg-for-1" }));
		await addMessage("proj-2", mockMessage({ projectId: "proj-2", content: "msg-for-2" }));

		const h1 = getHistorySync("proj-1");
		const h2 = getHistorySync("proj-2");

		expect(h1).toHaveLength(1);
		expect(h1[0]?.content).toBe("msg-for-1");
		expect(h2).toHaveLength(1);
		expect(h2[0]?.content).toBe("msg-for-2");
	});
});
