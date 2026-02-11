import cors from "cors";
import express from "express";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
	res.json({ status: "ok", service: "blueflame-api" });
});

app.listen(PORT, () => {
	console.log(`Blueflame API listening on http://localhost:${PORT}`);
});

export default app;
