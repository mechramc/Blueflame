import { resolve } from "node:path";
import { config } from "dotenv";

// Load .env from repo root (two levels up from apps/api/)
config({ path: resolve(import.meta.dirname, "../../..", ".env") });

import { createServer } from "node:http";
import { initTelemetry, isTelemetryEnabled } from "@blueflame/foundry";
import cors from "cors";
import express from "express";

// Initialize Application Insights (no-op if connection string not set)
initTelemetry();
import { authenticate, isDevMode } from "./middleware/auth.js";
import { chatRouter } from "./routes/chat.js";
import { createHub } from "./signalr/hub.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

// Health endpoint — no auth required
app.get("/health", (_req, res) => {
	res.json({
		status: "ok",
		service: "blueflame-api",
		version: process.env.npm_package_version ?? "0.0.1",
		telemetry: isTelemetryEnabled(),
		cosmos: !!process.env.COSMOS_ENDPOINT,
		entra: !!process.env.ENTRA_CLIENT_ID,
		devMode: isDevMode,
		uptime: process.uptime(),
	});
});

// Auth info endpoint — returns current auth mode and user info
app.get("/api/auth/me", authenticate, (req, res) => {
	res.json({
		devMode: isDevMode,
		user: req.user,
	});
});

import { authorizeRouter } from "./routes/authorize.js";
import { budgetRouter } from "./routes/budget.js";
import { chargebackRouter } from "./routes/chargeback.js";
import { complianceRouter } from "./routes/compliance.js";
import { deltaRouter } from "./routes/delta.js";
import { demoSeedRouter } from "./routes/demo-seed.js";
import { deploymentRouter } from "./routes/deployment.js";
import { executionRouter } from "./routes/execution.js";
import { failuresRouter } from "./routes/failures.js";
import { githubActionsRouter } from "./routes/github-actions.js";
import { knowledgeRouter } from "./routes/knowledge.js";
import { plansRouter } from "./routes/plans.js";
import { projectsRouter } from "./routes/projects.js";
import { remediationRouter } from "./routes/remediation.js";
import { scrRouter } from "./routes/scr.js";
import { specsRouter } from "./routes/specs.js";
import { adoWebhookRouter } from "./webhooks/ado.js";
import { webhookRouter } from "./webhooks/github.js";

// Apply auth middleware to all /api routes
app.use("/api", authenticate);

app.use("/api/projects", projectsRouter);
app.use("/api/compliance", complianceRouter);
app.use("/api/chargeback", chargebackRouter);
app.use("/api/chat", chatRouter);
app.use("/api/specs", specsRouter);
app.use("/api/plans", plansRouter);
app.use("/api/authorize", authorizeRouter);
app.use("/api/execution", executionRouter);
app.use("/api/webhooks", webhookRouter);
app.use("/api/webhooks", adoWebhookRouter);
app.use("/api/failures", failuresRouter);
app.use("/api/budget", budgetRouter);
app.use("/api/remediation", remediationRouter);
app.use("/api/specs", deltaRouter);
app.use("/api/knowledge", knowledgeRouter);
app.use("/api/github", githubActionsRouter);
app.use("/api/scr", scrRouter);
app.use("/api/deployment", deploymentRouter);
app.use("/api/demo", demoSeedRouter);

// ─── Global Express error handler (prevents crash on unhandled route errors) ───
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
	console.error("[API] Unhandled route error:", err.message, err.stack);
	res.status(500).json({ error: "Internal server error" });
});

const httpServer = createServer(app);

createHub(httpServer);

// ─── Process-level safety nets (log but don't crash) ───
process.on("unhandledRejection", (reason) => {
	console.error("[API] Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
	console.error("[API] Uncaught exception:", err.message, err.stack);
});

// Load persisted data from Cosmos on startup
import { loadAuditLogFromCosmos } from "./services/audit-logger.js";
import { loadCostEntriesFromCosmos } from "./services/cost-tracker.js";

httpServer.listen(Number(PORT), "0.0.0.0", () => {
	console.log(`Blueflame API listening on http://0.0.0.0:${PORT}`);
	// Fire-and-forget: warm caches and connections from Cosmos
	loadAuditLogFromCosmos().catch((err) => console.warn("[Startup] Audit log load failed:", err));
	loadCostEntriesFromCosmos("global").catch((err) =>
		console.warn("[Startup] Cost entries load failed:", err),
	);
	db.projects.findAll().catch((err) => console.warn("[Startup] Projects pre-warm failed:", err));
});

export default app;
