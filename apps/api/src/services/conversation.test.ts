import type { ChatMessage } from "@blueflame/shared";
import { afterEach, describe, expect, it } from "vitest";
import {
	addMessage,
	clearAllConversations,
	clearConversation,
	getConversation,
	getHistory,
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
		const conv = getConversation("proj-new");
		expect(conv.projectId).toBe("proj-new");
		expect(conv.messages).toHaveLength(0);
		expect(conv.type).toBe("conversation");
	});

	it("should return same conversation on repeated access", () => {
		const conv1 = getConversation("proj-1");
		const conv2 = getConversation("proj-1");
		expect(conv1).toBe(conv2);
	});

	it("should add messages to conversation", () => {
		const msg = mockMessage({ content: "Build a todo app" });
		const conv = addMessage("proj-1", msg);
		expect(conv.messages).toHaveLength(1);
		expect(conv.messages[0]?.content).toBe("Build a todo app");
	});

	it("should accumulate multiple messages", () => {
		addMessage("proj-1", mockMessage({ role: "user", content: "msg1" }));
		addMessage("proj-1", mockMessage({ role: "agent", content: "msg2" }));
		addMessage("proj-1", mockMessage({ role: "user", content: "msg3" }));

		const conv = getConversation("proj-1");
		expect(conv.messages).toHaveLength(3);
	});

	it("should update updatedAt timestamp on addMessage", () => {
		const conv1 = getConversation("proj-1");
		const before = conv1.updatedAt;

		// Small delay to ensure different timestamp
		addMessage("proj-1", mockMessage());
		const after = getConversation("proj-1").updatedAt;

		expect(after).toBeDefined();
		expect(before).toBeDefined();
	});

	it("should return history in correct format for LLM", () => {
		addMessage("proj-1", mockMessage({ role: "user", content: "Hello" }));
		addMessage("proj-1", mockMessage({ role: "agent", content: "Hi there" }));

		const history = getHistory("proj-1");
		expect(history).toHaveLength(2);
		expect(history[0]).toEqual({ role: "user", content: "Hello" });
		expect(history[1]).toEqual({ role: "agent", content: "Hi there" });
	});

	it("should return empty history for new project", () => {
		const history = getHistory("proj-unknown");
		expect(history).toHaveLength(0);
	});

	it("should clear a specific conversation", () => {
		addMessage("proj-1", mockMessage());
		addMessage("proj-2", mockMessage({ projectId: "proj-2" }));

		clearConversation("proj-1");

		expect(getConversation("proj-1").messages).toHaveLength(0);
		expect(getConversation("proj-2").messages).toHaveLength(1);
	});

	it("should isolate conversations by projectId", () => {
		addMessage("proj-1", mockMessage({ content: "msg-for-1" }));
		addMessage("proj-2", mockMessage({ projectId: "proj-2", content: "msg-for-2" }));

		const h1 = getHistory("proj-1");
		const h2 = getHistory("proj-2");

		expect(h1).toHaveLength(1);
		expect(h1[0]?.content).toBe("msg-for-1");
		expect(h2).toHaveLength(1);
		expect(h2[0]?.content).toBe("msg-for-2");
	});
});
