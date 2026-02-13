/**
 * Chat route — POST /api/chat
 *
 * Receives a user message, stores it, streams the Designer agent response
 * token-by-token via SignalR, stores the complete agent response.
 */

import type { DesignerConfig } from "@blueflame/foundry";
import { streamDesignerResponse } from "@blueflame/foundry";
import type { ChatMessage } from "@blueflame/shared";
import { Router } from "express";
import { addMessage, getHistory } from "../services/conversation.js";
import { getHub } from "../signalr/hub.js";

const router = Router();

function getDesignerConfig(): DesignerConfig {
	return {
		endpoint: process.env.FOUNDRY_ENDPOINT ?? process.env.AZURE_OPENAI_ENDPOINT ?? "",
		apiKey: process.env.FOUNDRY_API_KEY ?? process.env.AZURE_OPENAI_API_KEY ?? "",
		deployment: process.env.FOUNDRY_DEPLOYMENT ?? process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o",
		apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21",
	};
}

/**
 * POST /api/chat
 * Body: { projectId: string, message: string }
 * Response: { messageId: string, status: "streaming" }
 *
 * The agent response is streamed via SignalR to room `run:<projectId>`.
 */
router.post("/", async (req, res) => {
	const { projectId, message } = req.body as {
		projectId: string;
		message: string;
	};

	if (!projectId || !message) {
		res.status(400).json({ error: "projectId and message are required" });
		return;
	}

	const userMsg: ChatMessage = {
		id: `msg-${Date.now()}-user`,
		projectId,
		role: "user",
		content: message,
		createdAt: new Date().toISOString(),
	};
	await addMessage(projectId, userMsg);

	const agentMsgId = `msg-${Date.now()}-agent`;

	// Respond immediately — streaming happens via SignalR
	res.json({ messageId: agentMsgId, status: "streaming" });

	// Stream asynchronously
	const hub = getHub();
	const config = getDesignerConfig();
	const history = await getHistory(projectId);

	void streamDesignerResponse(config, history, {
		onToken(token) {
			hub.to(`run:${projectId}`).emit("run:status", {
				runId: projectId,
				status: `token:${token}`,
				updatedAt: new Date().toISOString(),
			});
		},
		onComplete(fullResponse) {
			const agentMsg: ChatMessage = {
				id: agentMsgId,
				projectId,
				role: "agent",
				content: fullResponse,
				createdAt: new Date().toISOString(),
			};
			void addMessage(projectId, agentMsg);

			hub.to(`run:${projectId}`).emit("run:status", {
				runId: projectId,
				status: "complete",
				updatedAt: new Date().toISOString(),
			});
		},
		onError(error) {
			console.error("[Chat] Designer agent error:", error.message);
			hub.to(`run:${projectId}`).emit("run:status", {
				runId: projectId,
				status: `error:${error.message}`,
				updatedAt: new Date().toISOString(),
			});
		},
	});
});

/**
 * GET /api/chat/:projectId
 * Returns the conversation history for a project.
 */
router.get("/:projectId", async (req, res) => {
	const { projectId } = req.params;
	const history = await getHistory(projectId);
	res.json({ projectId, messages: history });
});

export const chatRouter = router;
