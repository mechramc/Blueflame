/**
 * Conversation service — stores and retrieves chat message history.
 *
 * Uses in-memory cache with Cosmos DB write-through.
 * Messages are stored in the "documents" container (partitioned by projectId)
 * with a "conversation" document type.
 */

import type { ChatMessage } from "@blueflame/shared";
import { db } from "../db.js";

export interface Conversation {
	id: string;
	projectId: string;
	type: "conversation";
	messages: ChatMessage[];
	createdAt: string;
	updatedAt: string;
}

/** In-memory cache — hot state, backed by Cosmos */
const conversations = new Map<string, Conversation>();

/**
 * Persist a conversation to Cosmos (fire-and-forget with error logging).
 */
function persistConversation(conv: Conversation): void {
	db.documents
		.upsert(conv as never, conv.projectId)
		.catch((err) => console.error("[conversation] Cosmos persist failed:", err));
}

/**
 * Get or create the conversation for a project.
 * Falls back to Cosmos on cache miss.
 */
export async function getConversation(projectId: string): Promise<Conversation> {
	// Check memory cache first
	let conv = conversations.get(projectId);
	if (conv) return conv;

	// Try loading from Cosmos
	try {
		const result = await db.documents.read(`conv-${projectId}`, projectId);
		if (result.ok) {
			const doc = result.value as unknown as Conversation;
			conversations.set(projectId, doc);
			return doc;
		}
	} catch {
		// Cosmos unavailable — fall through to create new
	}

	// Create fresh conversation
	conv = {
		id: `conv-${projectId}`,
		projectId,
		type: "conversation",
		messages: [],
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};
	conversations.set(projectId, conv);
	persistConversation(conv);
	return conv;
}

/**
 * Synchronous getter for backward compatibility (returns cached or empty).
 */
export function getConversationSync(projectId: string): Conversation {
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
export async function addMessage(projectId: string, message: ChatMessage): Promise<Conversation> {
	const conv = await getConversation(projectId);
	conv.messages.push(message);
	conv.updatedAt = new Date().toISOString();
	persistConversation(conv);
	return conv;
}

/**
 * Get the message history for a project (for sending to the LLM).
 */
export async function getHistory(
	projectId: string,
): Promise<Array<{ role: "user" | "agent"; content: string }>> {
	const conv = await getConversation(projectId);
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
