import cors from "cors";
import express from "express";
import { config } from "./config.js";

const app = express();

app.use(cors({ origin: config.webOrigins }));
app.use(express.json());

const priorities = [
  { value: "critical", label: "Khẩn cấp", rank: 0 },
  { value: "high", label: "Cao", rank: 1 },
  { value: "medium", label: "Trung bình", rank: 2 },
  { value: "low", label: "Thấp", rank: 3 }
];

const departments = [
  { id: "dept-sale", name: "Sale" },
  { id: "dept-presale", name: "Pre-sale" },
  { id: "dept-postsale", name: "Post-sale" },
  { id: "dept-accounting", name: "Kế toán" },
  { id: "dept-procurement", name: "Mua hàng" }
];

const users = [
  { id: "u-minh", name: "Minh Nguyễn", departmentId: "dept-sale", role: "Project Owner" },
  { id: "u-lan", name: "Lan Trần", departmentId: "dept-presale", role: "Pre-sale Lead" },
  { id: "u-nam", name: "Nam Phạm", departmentId: "dept-postsale", role: "Implementation" },
  { id: "u-hoa", name: "Hoa Lê", departmentId: "dept-accounting", role: "Accounting" }
];

const projects = [
  {
    id: "prj-alpha",
    code: "ABC-2026",
    name: "Triển khai hạ tầng ABC",
    customer: "Công ty ABC",
    ownerId: "u-minh",
    priority: "high",
    status: "in_progress",
    currentStageId: "stg-alpha-bid",
    dueDate: "2026-06-30",
    progress: 42
  },
  {
    id: "prj-beta",
    code: "XYZ-2026",
    name: "Nâng cấp hệ thống XYZ",
    customer: "Tập đoàn XYZ",
    ownerId: "u-lan",
    priority: "critical",
    status: "blocked",
    currentStageId: "stg-beta-contract",
    dueDate: "2026-05-28",
    progress: 58
  }
];

const stages = [
  { id: "stg-alpha-consult", projectId: "prj-alpha", name: "Tư vấn", order: 1, status: "done", approvalRequired: false },
  { id: "stg-alpha-bid", projectId: "prj-alpha", name: "Đấu thầu", order: 2, status: "in_progress", approvalRequired: false },
  { id: "stg-alpha-contract", projectId: "prj-alpha", name: "Hợp đồng", order: 3, status: "todo", approvalRequired: true },
  { id: "stg-beta-bid", projectId: "prj-beta", name: "Đấu thầu", order: 1, status: "done", approvalRequired: false },
  { id: "stg-beta-contract", projectId: "prj-beta", name: "Hợp đồng", order: 2, status: "blocked", approvalRequired: true },
  { id: "stg-beta-payment", projectId: "prj-beta", name: "Thanh toán", order: 3, status: "todo", approvalRequired: false }
];

const tasks = [
  {
    id: "tsk-alpha-quote",
    projectId: "prj-alpha",
    stageId: "stg-alpha-bid",
    title: "Hoàn thiện báo giá bản cuối",
    assigneeId: "u-lan",
    priority: "high",
    status: "doing",
    dueDate: "2026-05-24",
    blocker: null
  },
  {
    id: "tsk-alpha-bom",
    projectId: "prj-alpha",
    stageId: "stg-alpha-bid",
    title: "Xác nhận BOM với mua hàng",
    assigneeId: "u-nam",
    priority: "medium",
    status: "waiting",
    dueDate: "2026-05-26",
    blocker: "Chờ giá từ nhà cung cấp"
  },
  {
    id: "tsk-beta-contract",
    projectId: "prj-beta",
    stageId: "stg-beta-contract",
    title: "Rà soát điều khoản thanh toán",
    assigneeId: "u-hoa",
    priority: "critical",
    status: "blocked",
    dueDate: "2026-05-21",
    blocker: "Chưa có xác nhận hạn mức công nợ"
  }
];

const teamsSources = [
  {
    id: "src-alpha-team",
    sourceType: "team",
    displayName: "Team dự án ABC",
    externalId: "team-abc-placeholder",
    mappingMode: "project",
    projectId: "prj-alpha",
    stageId: null,
    lastSyncedAt: "2026-05-20T08:00:00.000Z"
  },
  {
    id: "src-manager-chat",
    sourceType: "group_chat",
    displayName: "Chat giao việc Sale/Pre-sale",
    externalId: "chat-shared-placeholder",
    mappingMode: "work_intake",
    projectId: null,
    stageId: null,
    lastSyncedAt: null
  }
];

const messages = [
  {
    id: "msg-1",
    sourceId: "src-manager-chat",
    senderName: "Minh Nguyễn",
    content: "@Lan kiểm tra báo giá cho dự án ABC trước thứ Sáu nhé",
    sentAt: "2026-05-20T07:22:00.000Z",
    triageStatus: "suggested",
    suggestedProjectId: "prj-alpha",
    suggestedStageId: "stg-alpha-bid"
  },
  {
    id: "msg-2",
    sourceId: "src-manager-chat",
    senderName: "Minh Nguyễn",
    content: "@Hoa phần hợp đồng XYZ đang vướng điều khoản thanh toán",
    sentAt: "2026-05-20T07:35:00.000Z",
    triageStatus: "suggested",
    suggestedProjectId: "prj-beta",
    suggestedStageId: "stg-beta-contract"
  }
];

function enrichProject(project) {
  const owner = users.find((user) => user.id === project.ownerId);
  const currentStage = stages.find((stage) => stage.id === project.currentStageId);
  const projectTasks = tasks.filter((task) => task.projectId === project.id);
  const blockedTasks = projectTasks.filter((task) => task.status === "blocked" || task.blocker);

  return {
    ...project,
    owner,
    currentStage,
    tasksCount: projectTasks.length,
    blockedTasksCount: blockedTasks.length
  };
}

function enrichTask(task) {
  return {
    ...task,
    project: projects.find((project) => project.id === task.projectId),
    stage: stages.find((stage) => stage.id === task.stageId),
    assignee: users.find((user) => user.id === task.assigneeId)
  };
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "tasks-management-api" });
});

app.get("/api/meta", (_req, res) => {
  res.json({ priorities, departments, users });
});

app.get("/api/dashboard", (_req, res) => {
  const enrichedProjects = projects.map(enrichProject);
  const enrichedTasks = tasks.map(enrichTask);

  res.json({
    summary: {
      projects: projects.length,
      activeProjects: projects.filter((project) => project.status !== "done").length,
      blockedTasks: tasks.filter((task) => task.status === "blocked" || task.blocker).length,
      untriagedMessages: messages.filter((message) => message.triageStatus !== "mapped").length
    },
    projects: enrichedProjects,
    priorityTasks: enrichedTasks
      .filter((task) => ["critical", "high"].includes(task.priority))
      .sort((a, b) => priorities.find((priority) => priority.value === a.priority).rank - priorities.find((priority) => priority.value === b.priority).rank),
    workIntake: messages.map((message) => ({
      ...message,
      source: teamsSources.find((source) => source.id === message.sourceId),
      suggestedProject: projects.find((project) => project.id === message.suggestedProjectId),
      suggestedStage: stages.find((stage) => stage.id === message.suggestedStageId)
    }))
  });
});

app.get("/api/projects/:projectId", (req, res) => {
  const project = projects.find((item) => item.id === req.params.projectId);

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json({
    project: enrichProject(project),
    stages: stages.filter((stage) => stage.projectId === project.id).sort((a, b) => a.order - b.order),
    tasks: tasks.filter((task) => task.projectId === project.id).map(enrichTask),
    sources: teamsSources.filter((source) => source.projectId === project.id)
  });
});

app.listen(config.port, config.host, () => {
  console.log(`Tasks management API listening on http://${config.host}:${config.port}`);
});
