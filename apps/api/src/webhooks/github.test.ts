import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { clearWebhookHandlers, onWebhookEvent, webhookRouter } from "./github.js";

function createApp() {
	const app = express();
	app.use(express.json());
	app.use("/api/webhooks", webhookRouter);
	return app;
}

afterEach(() => {
	clearWebhookHandlers();
});

describe("GitHub Webhook Handler", () => {
	it("should respond to ping events", async () => {
		const app = createApp();
		const res = await request(app)
			.post("/api/webhooks/github")
			.set("X-GitHub-Event", "ping")
			.send({ zen: "Keep it logically awesome." });

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("pong");
	});

	it("should reject requests without X-GitHub-Event header", async () => {
		const app = createApp();
		const res = await request(app)
			.post("/api/webhooks/github")
			.send({ action: "completed" });

		expect(res.status).toBe(400);
		expect(res.body.error).toContain("Missing X-GitHub-Event");
	});

	it("should accept workflow_run.completed events", async () => {
		const app = createApp();
		const res = await request(app)
			.post("/api/webhooks/github")
			.set("X-GitHub-Event", "workflow_run")
			.send({
				action: "completed",
				workflow_run: {
					id: 1001,
					conclusion: "success",
					head_branch: "feature/test",
				},
			});

		expect(res.status).toBe(200);
		expect(res.body.received).toBe(true);
		expect(res.body.event).toBe("workflow_run");
		expect(res.body.action).toBe("completed");
	});

	it("should accept check_run.completed events", async () => {
		const app = createApp();
		const res = await request(app)
			.post("/api/webhooks/github")
			.set("X-GitHub-Event", "check_run")
			.send({
				action: "completed",
				check_run: {
					name: "build",
					conclusion: "success",
				},
			});

		expect(res.status).toBe(200);
		expect(res.body.event).toBe("check_run");
	});

	it("should accept pull_request_review.submitted events", async () => {
		const app = createApp();
		const res = await request(app)
			.post("/api/webhooks/github")
			.set("X-GitHub-Event", "pull_request_review")
			.send({
				action: "submitted",
				review: { state: "approved" },
				pull_request: { number: 42 },
			});

		expect(res.status).toBe(200);
		expect(res.body.event).toBe("pull_request_review");
	});

	it("should route events to registered handlers", async () => {
		const handler = vi.fn();
		onWebhookEvent(handler);

		const app = createApp();
		await request(app)
			.post("/api/webhooks/github")
			.set("X-GitHub-Event", "workflow_run")
			.send({ action: "completed", workflow_run: {} });

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "workflow_run",
				action: "completed",
			}),
		);
	});

	it("should route to multiple handlers", async () => {
		const handler1 = vi.fn();
		const handler2 = vi.fn();
		onWebhookEvent(handler1);
		onWebhookEvent(handler2);

		const app = createApp();
		await request(app)
			.post("/api/webhooks/github")
			.set("X-GitHub-Event", "check_run")
			.send({ action: "completed", check_run: {} });

		expect(handler1).toHaveBeenCalledTimes(1);
		expect(handler2).toHaveBeenCalledTimes(1);
	});

	it("should clear handlers", async () => {
		const handler = vi.fn();
		onWebhookEvent(handler);
		clearWebhookHandlers();

		const app = createApp();
		await request(app)
			.post("/api/webhooks/github")
			.set("X-GitHub-Event", "workflow_run")
			.send({ action: "completed" });

		expect(handler).not.toHaveBeenCalled();
	});
});
