import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { pingDatabase } from "./db.js";
import { getDashboard, getMeta, getProjectDetail } from "./repositories/dashboardRepository.js";

const app = express();

app.use(cors({ origin: config.webOrigins }));
app.use(express.json());

app.get("/health", async (_req, res, next) => {
  try {
    const database = await pingDatabase();

    res.json({
      ok: true,
      service: "tasks-management-api",
      database
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/meta", async (_req, res, next) => {
  try {
    res.json(await getMeta());
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard", async (_req, res, next) => {
  try {
    res.json(await getDashboard());
  } catch (error) {
    next(error);
  }
});

app.get("/api/projects/:projectId", async (req, res, next) => {
  try {
    const detail = await getProjectDetail(req.params.projectId);

    if (!detail) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json(detail);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    error: "Internal server error",
    message: config.nodeEnv === "development" ? error.message : undefined
  });
});

app.listen(config.port, config.host, () => {
  console.log(`Tasks management API listening on http://${config.host}:${config.port}`);
});
