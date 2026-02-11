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

import { specsRouter } from "./routes/specs.js";

app.use("/api/chat", chatRouter);
app.use("/api/specs", specsRouter);

const httpServer = createServer(app);

createHub(httpServer);

httpServer.listen(PORT, () => {
	console.log(`Blueflame API listening on http://localhost:${PORT}`);
});

export default app;
