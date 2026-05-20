import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { pingDatabase } from "./db.js";
import { getDashboard, getMeta, getProjectDetail } from "./repositories/dashboardRepository.js";
import {
  createDepartment,
  createProject,
  createStage,
  createTask,
  createUser,
  deleteDepartment,
  deleteProject,
  deleteStage,
  deleteTask,
  deleteUser,
  listDepartments,
  listProjectOptions,
  listUsers,
  updateDepartment,
  updateProject,
  updateStage,
  updateTask,
  updateUser
} from "./repositories/workItemsRepository.js";

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

app.get("/api/departments", async (_req, res, next) => {
  try {
    res.json(await listDepartments());
  } catch (error) {
    next(error);
  }
});

app.post("/api/departments", async (req, res, next) => {
  try {
    res.status(201).json(await createDepartment(req.body));
  } catch (error) {
    next(error);
  }
});

app.put("/api/departments/:departmentId", async (req, res, next) => {
  try {
    res.json(await updateDepartment(req.params.departmentId, req.body));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/departments/:departmentId", async (req, res, next) => {
  try {
    await deleteDepartment(req.params.departmentId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/users", async (_req, res, next) => {
  try {
    res.json(await listUsers());
  } catch (error) {
    next(error);
  }
});

app.post("/api/users", async (req, res, next) => {
  try {
    res.status(201).json(await createUser(req.body));
  } catch (error) {
    next(error);
  }
});

app.put("/api/users/:userId", async (req, res, next) => {
  try {
    res.json(await updateUser(req.params.userId, req.body));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/users/:userId", async (req, res, next) => {
  try {
    await deleteUser(req.params.userId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/projects", async (_req, res, next) => {
  try {
    res.json(await listProjectOptions());
  } catch (error) {
    next(error);
  }
});

app.post("/api/projects", async (req, res, next) => {
  try {
    res.status(201).json(await createProject(req.body));
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

app.put("/api/projects/:projectId", async (req, res, next) => {
  try {
    res.json(await updateProject(req.params.projectId, req.body));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/projects/:projectId", async (req, res, next) => {
  try {
    await deleteProject(req.params.projectId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post("/api/stages", async (req, res, next) => {
  try {
    res.status(201).json(await createStage(req.body));
  } catch (error) {
    next(error);
  }
});

app.put("/api/stages/:stageId", async (req, res, next) => {
  try {
    res.json(await updateStage(req.params.stageId, req.body));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/stages/:stageId", async (req, res, next) => {
  try {
    await deleteStage(req.params.stageId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post("/api/tasks", async (req, res, next) => {
  try {
    res.status(201).json(await createTask(req.body));
  } catch (error) {
    next(error);
  }
});

app.put("/api/tasks/:taskId", async (req, res, next) => {
  try {
    res.json(await updateTask(req.params.taskId, req.body));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/tasks/:taskId", async (req, res, next) => {
  try {
    await deleteTask(req.params.taskId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.message?.includes("required") || error.message?.includes("invalid") ? 400 : 500).json({
    error: error.message?.includes("required") || error.message?.includes("invalid") ? "Bad request" : "Internal server error",
    message: config.nodeEnv === "development" ? error.message : undefined
  });
});

app.listen(config.port, config.host, () => {
  console.log(`Tasks management API listening on http://${config.host}:${config.port}`);
});
