import { priorities, priorityRank } from "../priorities.js";
import { query } from "../db.js";

function toBoolean(value) {
  return Boolean(Number(value));
}

function calculateProgress(projectStages) {
  if (projectStages.length === 0) {
    return 0;
  }

  const completedStages = projectStages.filter((stage) => stage.status === "done").length;
  return Math.round((completedStages / projectStages.length) * 100);
}

function findCurrentStage(projectStages) {
  return (
    projectStages.find((stage) => ["in_progress", "blocked"].includes(stage.status)) ||
    projectStages.find((stage) => stage.status === "todo") ||
    projectStages.at(-1) ||
    null
  );
}

function mapUser(row, prefix = "owner") {
  if (!row[`${prefix}_id`]) {
    return null;
  }

  return {
    id: row[`${prefix}_id`],
    name: row[`${prefix}_name`],
    email: row[`${prefix}_email`],
    departmentId: row[`${prefix}_department_id`] ?? null
  };
}

function mapStage(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    order: row.stage_order,
    status: row.status,
    approvalRequired: toBoolean(row.approval_required),
    startedAt: row.started_at,
    completedAt: row.completed_at
  };
}

function mapTask(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    stageId: row.stage_id,
    title: row.title,
    description: row.description,
    assigneeId: row.assignee_user_id,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    blocker: row.blocker,
    project: {
      id: row.project_id,
      code: row.project_code,
      name: row.project_name
    },
    stage: row.stage_id
      ? {
          id: row.stage_id,
          name: row.stage_name
        }
      : null,
    assignee: mapUser(row, "assignee")
  };
}

function mapSource(row) {
  return {
    id: row.id,
    sourceType: row.source_type,
    displayName: row.display_name,
    externalId: row.microsoft_chat_id || row.microsoft_channel_id || row.microsoft_team_id,
    mappingMode: row.mapping_mode,
    projectId: row.project_id,
    stageId: row.stage_id,
    lastSyncedAt: row.last_synced_at
  };
}

async function getProjects() {
  return query(`
    SELECT
      p.id,
      p.code,
      p.name,
      p.customer_name,
      p.owner_user_id,
      p.priority,
      p.status,
      p.due_date,
      u.id AS owner_id,
      u.display_name AS owner_name,
      u.email AS owner_email,
      u.department_id AS owner_department_id
    FROM projects p
    LEFT JOIN users u ON u.id = p.owner_user_id
    ORDER BY
      FIELD(p.priority, 'critical', 'high', 'medium', 'low'),
      p.due_date IS NULL,
      p.due_date ASC,
      p.created_at DESC
  `);
}

async function getStages(projectId = null) {
  const where = projectId ? "WHERE project_id = :projectId" : "";
  return query(
    `
      SELECT id, project_id, name, stage_order, status, approval_required, started_at, completed_at
      FROM project_stages
      ${where}
      ORDER BY project_id, stage_order, id
    `,
    { projectId }
  );
}

async function getTasks(projectId = null) {
  const where = projectId ? "WHERE t.project_id = :projectId" : "";
  return query(
    `
      SELECT
        t.id,
        t.project_id,
        t.stage_id,
        t.title,
        t.description,
        t.assignee_user_id,
        t.priority,
        t.status,
        t.due_date,
        p.code AS project_code,
        p.name AS project_name,
        ps.name AS stage_name,
        u.id AS assignee_id,
        u.display_name AS assignee_name,
        u.email AS assignee_email,
        u.department_id AS assignee_department_id,
        open_blockers.description AS blocker
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN project_stages ps ON ps.id = t.stage_id
      LEFT JOIN users u ON u.id = t.assignee_user_id
      LEFT JOIN (
        SELECT task_id, MIN(description) AS description
        FROM task_blockers
        WHERE status = 'open'
        GROUP BY task_id
      ) open_blockers ON open_blockers.task_id = t.id
      ${where}
      ORDER BY
        FIELD(t.priority, 'critical', 'high', 'medium', 'low'),
        t.due_date IS NULL,
        t.due_date ASC,
        t.updated_at DESC
    `,
    { projectId }
  );
}

async function getSources(projectId = null) {
  const where = projectId ? "WHERE project_id = :projectId" : "";
  return query(
    `
      SELECT
        id,
        source_type,
        microsoft_team_id,
        microsoft_channel_id,
        microsoft_chat_id,
        display_name,
        mapping_mode,
        project_id,
        stage_id,
        last_synced_at
      FROM teams_sources
      ${where}
      ORDER BY created_at DESC
    `,
    { projectId }
  );
}

async function getWorkIntakeMessages() {
  return query(`
    SELECT
      tm.id,
      tm.teams_source_id,
      tm.sender_display_name,
      tm.content_text,
      tm.sent_at,
      tm.triage_status,
      ts.id AS source_id,
      ts.source_type,
      ts.display_name,
      ts.mapping_mode,
      ts.project_id AS source_project_id,
      ts.stage_id AS source_stage_id,
      linked_project.id AS linked_project_id,
      linked_project.code AS linked_project_code,
      linked_project.name AS linked_project_name,
      linked_stage.id AS linked_stage_id,
      linked_stage.name AS linked_stage_name
    FROM teams_messages tm
    JOIN teams_sources ts ON ts.id = tm.teams_source_id
    LEFT JOIN message_task_links mtl ON mtl.teams_message_id = tm.id
    LEFT JOIN projects linked_project ON linked_project.id = COALESCE(mtl.project_id, ts.project_id)
    LEFT JOIN project_stages linked_stage ON linked_stage.id = COALESCE(mtl.stage_id, ts.stage_id)
    WHERE tm.triage_status IN ('untriaged', 'suggested')
    ORDER BY tm.sent_at DESC
    LIMIT 50
  `);
}

export async function getMeta() {
  const [departments, users] = await Promise.all([
    query("SELECT id, name, code FROM departments ORDER BY name"),
    query(`
      SELECT
        id,
        microsoft_user_id AS microsoftUserId,
        email,
        display_name AS name,
        department_id AS departmentId,
        is_active AS isActive
      FROM users
      ORDER BY display_name
    `)
  ]);

  return {
    priorities,
    departments,
    users: users.map((user) => ({
      ...user,
      isActive: toBoolean(user.isActive)
    }))
  };
}

export async function getDashboard() {
  const [projectRows, stageRows, taskRows, intakeRows] = await Promise.all([
    getProjects(),
    getStages(),
    getTasks(),
    getWorkIntakeMessages()
  ]);

  const stages = stageRows.map(mapStage);
  const tasks = taskRows.map(mapTask);

  const projects = projectRows.map((project) => {
    const projectStages = stages.filter((stage) => stage.projectId === project.id);
    const projectTasks = tasks.filter((task) => task.projectId === project.id);
    const blockedTasks = projectTasks.filter((task) => task.status === "blocked" || task.blocker);

    return {
      id: project.id,
      code: project.code,
      name: project.name,
      customer: project.customer_name,
      ownerId: project.owner_user_id,
      priority: project.priority,
      status: project.status,
      dueDate: project.due_date,
      progress: calculateProgress(projectStages),
      owner: mapUser(project),
      currentStage: findCurrentStage(projectStages),
      tasksCount: projectTasks.length,
      blockedTasksCount: blockedTasks.length
    };
  });

  return {
    summary: {
      projects: projects.length,
      activeProjects: projects.filter((project) => !["done", "cancelled"].includes(project.status)).length,
      blockedTasks: tasks.filter((task) => task.status === "blocked" || task.blocker).length,
      untriagedMessages: intakeRows.length
    },
    projects,
    priorityTasks: tasks
      .filter((task) => ["critical", "high"].includes(task.priority))
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)),
    allTasks: tasks,
    allStages: stages,
    workIntake: intakeRows.map((message) => ({
      id: message.id,
      sourceId: message.teams_source_id,
      senderName: message.sender_display_name || "Unknown",
      content: message.content_text || "",
      sentAt: message.sent_at,
      triageStatus: message.triage_status,
      source: {
        id: message.source_id,
        sourceType: message.source_type,
        displayName: message.display_name,
        mappingMode: message.mapping_mode
      },
      suggestedProject: message.linked_project_id
        ? {
            id: message.linked_project_id,
            code: message.linked_project_code,
            name: message.linked_project_name
          }
        : null,
      suggestedStage: message.linked_stage_id
        ? {
            id: message.linked_stage_id,
            name: message.linked_stage_name
          }
        : null
    }))
  };
}

export async function getProjectDetail(projectId) {
  const [projectRows, stageRows, taskRows, sourceRows] = await Promise.all([
    getProjects(),
    getStages(projectId),
    getTasks(projectId),
    getSources(projectId)
  ]);

  const project = projectRows.find((item) => String(item.id) === String(projectId));

  if (!project) {
    return null;
  }

  const stages = stageRows.map(mapStage);
  const tasks = taskRows.map(mapTask);
  const blockedTasks = tasks.filter((task) => task.status === "blocked" || task.blocker);

  return {
    project: {
      id: project.id,
      code: project.code,
      name: project.name,
      customer: project.customer_name,
      ownerId: project.owner_user_id,
      priority: project.priority,
      status: project.status,
      dueDate: project.due_date,
      progress: calculateProgress(stages),
      owner: mapUser(project),
      currentStage: findCurrentStage(stages),
      tasksCount: tasks.length,
      blockedTasksCount: blockedTasks.length
    },
    stages,
    tasks,
    sources: sourceRows.map(mapSource)
  };
}
