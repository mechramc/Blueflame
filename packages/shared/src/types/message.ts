/**
 * Chat message types for the conversation interface.
 * Source: Blueflame-Spec-v3-ACAR.md Section 10 (Stage 1: Chat)
 */

/** Who sent the message */
export type MessageRole = "user" | "agent";

/** A single chat message in a conversation */
export interface ChatMessage {
	/** Unique message ID */
	id: string;
	/** Conversation/project context */
	projectId: string;
	/** Who sent it */
	role: MessageRole;
	/** Message content (markdown for agent, plain text for user) */
	content: string;
	/** ISO 8601 timestamp */
	createdAt: string;
	/** Whether the message is still being streamed */
	streaming?: boolean;
}
