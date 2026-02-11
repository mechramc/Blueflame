/**
 * Conversation service — stores and retrieves chat message history in Cosmos DB.
 *
 * Messages are stored in the "documents" container (partitioned by projectId)
 * with a "conversation" document type. Each project has one conversation document
 * that accumulates messages.
 */

import type { ChatMessage } from "@blueflame/shared";

export interface Conversation {
	id: string;
	projectId: string;
	type: "conversation";
	messages: ChatMessage[];
	createdAt: string;
	updatedAt: string;
}

/** In-memory store for MVP — will be replaced with Cosmos DB in production */
const conversations = new Map<string, Conversation>();

/**
 * Get or create the conversation for a project.
 */
export function getConversation(projectId: string): Conversation {
	let conv = conversations.get(projectId);
	if (!conv) {
		conv = {
			id: `conv-${projectId}`,
			projectId,
			type: "conversation",
			messages: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		conversations.set(projectId, conv);
	}
	return conv;
}

/**
 * Append a message to the conversation.
 */
export function addMessage(projectId: string, message: ChatMessage): Conversation {
	const conv = getConversation(projectId);
	conv.messages.push(message);
	conv.updatedAt = new Date().toISOString();
	return conv;
}

/**
 * Get the message history for a project (for sending to the LLM).
 */
export function getHistory(projectId: string): Array<{ role: "user" | "agent"; content: string }> {
	const conv = getConversation(projectId);
	return conv.messages.map((m) => ({
		role: m.role,
		content: m.content,
	}));
}

/**
 * Clear conversation (for testing).
 */
export function clearConversation(projectId: string): void {
	conversations.delete(projectId);
}

/**
 * Clear all conversations (for testing).
 */
export function clearAllConversations(): void {
	conversations.clear();
}
