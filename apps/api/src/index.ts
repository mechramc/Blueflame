import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import { chatRouter } from "./routes/chat.js";
import { createHub } from "./signalr/hub.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
	res.json({ status: "ok", service: "blueflame-api" });
});

import { authorizeRouter } from "./routes/authorize.js";
import { budgetRouter } from "./routes/budget.js";
import { executionRouter } from "./routes/execution.js";
import { failuresRouter } from "./routes/failures.js";
import { plansRouter } from "./routes/plans.js";
import { remediationRouter } from "./routes/remediation.js";
import { specsRouter } from "./routes/specs.js";
import { adoWebhookRouter } from "./webhooks/ado.js";
import { webhookRouter } from "./webhooks/github.js";

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

const httpServer = createServer(app);

createHub(httpServer);

httpServer.listen(PORT, () => {
	console.log(`Blueflame API listening on http://localhost:${PORT}`);
});

export default app;
