import { query } from "../db.js";

const projectStatuses = new Set(["draft", "in_progress", "blocked", "paused", "done", "cancelled"]);
const stageStatuses = new Set(["todo", "in_progress", "blocked", "done", "skipped"]);
const taskStatuses = new Set(["todo", "doing", "waiting", "blocked", "review", "done", "cancelled"]);
const priorities = new Set(["critical", "high", "medium", "low"]);

function requiredString(payload, field) {
  const value = payload[field]?.trim();

  if (!value) {
    throw new Error(`${field} is required`);
  }

  return value;
}

function optionalString(payload, field, fallback) {
  if (payload[field] === undefined) {
    return fallback;
  }

  return nullableString(payload, field);
}

function optionalNumber(payload, field, fallback) {
  if (payload[field] === undefined) {
    return fallback;
  }

  return nullableNumber(payload, field);
}

function optionalEnum(payload, field, allowed, fallback) {
  if (payload[field] === undefined || payload[field] === null || payload[field] === "") {
    return fallback;
  }

  return enumValue(payload, field, allowed, fallback);
}

function nullableString(payload, field) {
  const value = payload[field];

  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value).trim();
}

function nullableNumber(payload, field) {
  const value = payload[field];

  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`${field} must be a number`);
  }

  return parsed;
}

function enumValue(payload, field, allowed, fallback) {
  const value = payload[field] || fallback;

  if (!allowed.has(value)) {
    throw new Error(`${field} is invalid`);
  }

  return value;
}

export async function listDepartments() {
  return query("SELECT id, name, code FROM departments ORDER BY name");
}

export async function createDepartment(payload) {
  const name = requiredString(payload, "name");
  const code = nullableString(payload, "code");

  const result = await query("INSERT INTO departments (name, code) VALUES (:name, :code)", { name, code });
  return { id: result.insertId, name, code };
}

export async function updateDepartment(id, payload) {
  const name = requiredString(payload, "name");
  const code = nullableString(payload, "code");

  await query("UPDATE departments SET name = :name, code = :code WHERE id = :id", { id, name, code });
  return { id: Number(id), name, code };
}

export async function deleteDepartment(id) {
  await query("DELETE FROM departments WHERE id = :id", { id });
}

export async function listUsers() {
  return query(`
    SELECT
      u.id,
      u.microsoft_user_id AS microsoftUserId,
      u.email,
      u.display_name AS name,
      u.department_id AS departmentId,
      d.name AS departmentName,
      u.is_active AS isActive
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    ORDER BY u.display_name
  `);
}

export async function createUser(payload) {
  const email = requiredString(payload, "email");
  const name = requiredString(payload, "name");
  const departmentId = nullableNumber(payload, "departmentId");
  const microsoftUserId = nullableString(payload, "microsoftUserId");

  const result = await query(
    `
      INSERT INTO users (email, display_name, department_id, microsoft_user_id)
      VALUES (:email, :name, :departmentId, :microsoftUserId)
    `,
    { email, name, departmentId, microsoftUserId }
  );

  return { id: result.insertId, email, name, departmentId, microsoftUserId, isActive: true };
}

export async function updateUser(id, payload) {
  const email = requiredString(payload, "email");
  const name = requiredString(payload, "name");
  const departmentId = nullableNumber(payload, "departmentId");
  const microsoftUserId = nullableString(payload, "microsoftUserId");
  const isActive = payload.isActive === undefined ? true : Boolean(payload.isActive);

  await query(
    `
      UPDATE users
      SET email = :email,
          display_name = :name,
          department_id = :departmentId,
          microsoft_user_id = :microsoftUserId,
          is_active = :isActive
      WHERE id = :id
    `,
    { id, email, name, departmentId, microsoftUserId, isActive }
  );

  return { id: Number(id), email, name, departmentId, microsoftUserId, isActive };
}

export async function deleteUser(id) {
  await query("DELETE FROM users WHERE id = :id", { id });
}

export async function listProjectOptions() {
  const projects = await query(`
    SELECT
      p.id,
      p.code,
      p.name,
      p.customer_name AS customer,
      p.owner_user_id AS ownerId,
      p.priority,
      p.status,
      p.due_date AS dueDate,
      u.display_name AS ownerName
    FROM projects p
    LEFT JOIN users u ON u.id = p.owner_user_id
    ORDER BY FIELD(p.priority, 'critical', 'high', 'medium', 'low'), p.created_at DESC
  `);
  const stages = await query(`
    SELECT id, project_id AS projectId, name, stage_order AS stageOrder, status
    FROM project_stages
    ORDER BY project_id, stage_order, id
  `);

  return projects.map((project) => ({
    ...project,
    stages: stages.filter((stage) => stage.projectId === project.id)
  }));
}

async function getProjectForUpdate(id) {
  const [project] = await query(
    `
      SELECT code, name, customer_name AS customer, owner_user_id AS ownerId, priority, status, due_date AS dueDate
      FROM projects
      WHERE id = :id
    `,
    { id }
  );

  if (!project) {
    throw new Error("project not found");
  }

  return project;
}

async function getTaskForUpdate(id) {
  const [task] = await query(
    `
      SELECT project_id AS projectId, stage_id AS stageId, title, description, assignee_user_id AS assigneeId, priority, status, due_date AS dueDate
      FROM tasks
      WHERE id = :id
    `,
    { id }
  );

  if (!task) {
    throw new Error("task not found");
  }

  return task;
}

export async function createProject(payload) {
  const code = requiredString(payload, "code");
  const name = requiredString(payload, "name");
  const customer = nullableString(payload, "customer");
  const ownerId = nullableNumber(payload, "ownerId");
  const priority = enumValue(payload, "priority", priorities, "medium");
  const status = enumValue(payload, "status", projectStatuses, "in_progress");
  const dueDate = nullableString(payload, "dueDate");
  const stageNames = Array.isArray(payload.stageNames) ? payload.stageNames.filter(Boolean) : [];

  const result = await query(
    `
      INSERT INTO projects (code, name, customer_name, owner_user_id, priority, status, due_date)
      VALUES (:code, :name, :customer, :ownerId, :priority, :status, :dueDate)
    `,
    { code, name, customer, ownerId, priority, status, dueDate }
  );

  const projectId = result.insertId;

  for (const [index, stageName] of stageNames.entries()) {
    await query(
      `
        INSERT INTO project_stages (project_id, name, stage_order, status)
        VALUES (:projectId, :name, :stageOrder, :status)
      `,
      {
        projectId,
        name: stageName.trim(),
        stageOrder: index + 1,
        status: index === 0 ? "in_progress" : "todo"
      }
    );
  }

  return { id: projectId, code, name, customer, ownerId, priority, status, dueDate };
}

export async function updateProject(id, payload) {
  const current = await getProjectForUpdate(id);
  const code = payload.code === undefined ? current.code : requiredString(payload, "code");
  const name = payload.name === undefined ? current.name : requiredString(payload, "name");
  const customer = optionalString(payload, "customer", current.customer);
  const ownerId = optionalNumber(payload, "ownerId", current.ownerId);
  const priority = optionalEnum(payload, "priority", priorities, current.priority);
  const status = optionalEnum(payload, "status", projectStatuses, current.status);
  const dueDate = optionalString(payload, "dueDate", current.dueDate);

  await query(
    `
      UPDATE projects
      SET code = :code,
          name = :name,
          customer_name = :customer,
          owner_user_id = :ownerId,
          priority = :priority,
          status = :status,
          due_date = :dueDate
      WHERE id = :id
    `,
    { id, code, name, customer, ownerId, priority, status, dueDate }
  );

  return { id: Number(id), code, name, customer, ownerId, priority, status, dueDate };
}

export async function deleteProject(id) {
  await query("DELETE FROM projects WHERE id = :id", { id });
}

export async function createStage(payload) {
  const projectId = nullableNumber(payload, "projectId");

  if (!projectId) {
    throw new Error("projectId is required");
  }

  const name = requiredString(payload, "name");
  const status = enumValue(payload, "status", stageStatuses, "todo");
  const approvalRequired = Boolean(payload.approvalRequired);

  const [orderRow] = await query("SELECT COALESCE(MAX(stage_order), 0) + 1 AS nextOrder FROM project_stages WHERE project_id = :projectId", {
    projectId
  });

  const result = await query(
    `
      INSERT INTO project_stages (project_id, name, stage_order, status, approval_required)
      VALUES (:projectId, :name, :stageOrder, :status, :approvalRequired)
    `,
    { projectId, name, stageOrder: orderRow.nextOrder, status, approvalRequired }
  );

  return { id: result.insertId, projectId, name, status, approvalRequired };
}

export async function updateStage(id, payload) {
  const name = requiredString(payload, "name");
  const status = enumValue(payload, "status", stageStatuses, "todo");
  const approvalRequired = Boolean(payload.approvalRequired);

  await query(
    `
      UPDATE project_stages
      SET name = :name,
          status = :status,
          approval_required = :approvalRequired
      WHERE id = :id
    `,
    { id, name, status, approvalRequired }
  );

  return { id: Number(id), name, status, approvalRequired };
}

export async function deleteStage(id) {
  await query("DELETE FROM project_stages WHERE id = :id", { id });
}

export async function createTask(payload) {
  const projectId = nullableNumber(payload, "projectId");

  if (!projectId) {
    throw new Error("projectId is required");
  }

  const title = requiredString(payload, "title");
  const description = nullableString(payload, "description");
  const stageId = nullableNumber(payload, "stageId");
  const assigneeId = nullableNumber(payload, "assigneeId");
  const priority = enumValue(payload, "priority", priorities, "medium");
  const status = enumValue(payload, "status", taskStatuses, "todo");
  const dueDate = nullableString(payload, "dueDate");

  const result = await query(
    `
      INSERT INTO tasks (project_id, stage_id, title, description, assignee_user_id, priority, status, due_date)
      VALUES (:projectId, :stageId, :title, :description, :assigneeId, :priority, :status, :dueDate)
    `,
    { projectId, stageId, title, description, assigneeId, priority, status, dueDate }
  );

  return { id: result.insertId, projectId, stageId, title, description, assigneeId, priority, status, dueDate };
}

export async function updateTask(id, payload) {
  const current = await getTaskForUpdate(id);
  const projectId = optionalNumber(payload, "projectId", current.projectId);

  if (!projectId) {
    throw new Error("projectId is required");
  }

  const title = payload.title === undefined ? current.title : requiredString(payload, "title");
  const description = optionalString(payload, "description", current.description);
  const stageId = optionalNumber(payload, "stageId", current.stageId);
  const assigneeId = optionalNumber(payload, "assigneeId", current.assigneeId);
  const priority = optionalEnum(payload, "priority", priorities, current.priority);
  const status = optionalEnum(payload, "status", taskStatuses, current.status);
  const dueDate = optionalString(payload, "dueDate", current.dueDate);

  await query(
    `
      UPDATE tasks
      SET project_id = :projectId,
          stage_id = :stageId,
          title = :title,
          description = :description,
          assignee_user_id = :assigneeId,
          priority = :priority,
          status = :status,
          due_date = :dueDate
      WHERE id = :id
    `,
    { id, projectId, stageId, title, description, assigneeId, priority, status, dueDate }
  );

  return { id: Number(id), projectId, stageId, title, description, assigneeId, priority, status, dueDate };
}

export async function deleteTask(id) {
  await query("DELETE FROM tasks WHERE id = :id", { id });
}
