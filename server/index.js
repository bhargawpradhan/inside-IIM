import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { runInvestmentResearch } from "./researchAgent.js";

const app = express();
const port = Number(process.env.PORT || 8787);
const frontendPort = Number(process.env.FRONTEND_PORT || 5173);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, "..", "dist");

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "investment-research-agent" });
});

app.post("/api/research", async (req, res) => {
  const body = z.object({
    companyName: z.string().trim().min(2),
    range: z.enum(["1mo", "3mo", "6mo", "1y", "2y"]).optional()
  }).safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Please provide a company name with at least 2 characters." });
  }

  try {
    const result = await runInvestmentResearch(body.data.companyName, body.data.range || "1y");
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "The research agent failed while preparing the memo.",
      detail: process.env.NODE_ENV === "production" ? undefined : error.message
    });
  }
});

// Serve static client assets
app.use(express.static(distPath));

// Fallback for single-page applications
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, () => {
  console.log(`Investment research server running on port ${port}`);
});
