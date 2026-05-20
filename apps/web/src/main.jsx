import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock3,
  Inbox,
  Layers3,
  MessageSquareText,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound
} from "lucide-react";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("Missing required environment variable: VITE_API_BASE_URL");
}

const priorityLabels = {
  critical: "Khẩn cấp",
  high: "Cao",
  medium: "Trung bình",
  low: "Thấp"
};

const statusLabels = {
  draft: "Nháp",
  todo: "Chưa làm",
  doing: "Đang xử lý",
  waiting: "Đang chờ",
  blocked: "Đang vướng",
  review: "Đang review",
  done: "Hoàn tất",
  skipped: "Bỏ qua",
  cancelled: "Đã hủy",
  in_progress: "Đang chạy"
};

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || payload.error || "Không thể xử lý yêu cầu");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function PriorityBadge({ value }) {
  return <span className={`priority priority-${value}`}>{priorityLabels[value] || value}</span>;
}

function StatusPill({ value }) {
  return <span className={`status status-${value}`}>{statusLabels[value] || value}</span>;
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <section className={`stat-card ${tone || ""}`}>
      <div className="stat-icon">
        <Icon size={20} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </section>
  );
}

function ProjectCard({ project }) {
  return (
    <article className="project-card">
      <div className="project-card-header">
        <div>
          <span className="project-code">{project.code}</span>
          <h3>{project.name}</h3>
          <p>{project.customer}</p>
        </div>
        <PriorityBadge value={project.priority} />
      </div>

      <div className="project-meta">
        <span>
          <UsersRound size={16} />
          {project.owner?.name || "Chưa có owner"}
        </span>
        <span>
          <Layers3 size={16} />
          {project.currentStage?.name || "Chưa có stage"}
        </span>
      </div>

      <div className="progress-row">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${project.progress}%` }} />
        </div>
        <strong>{project.progress}%</strong>
      </div>

      <footer>
        <StatusPill value={project.status} />
        <span>{project.tasksCount} việc</span>
        <span>{project.blockedTasksCount} vướng mắc</span>
      </footer>
    </article>
  );
}

function TaskRow({ task }) {
  return (
    <div className="task-row">
      <div className="task-title">
        <CircleDot size={16} />
        <div>
          <strong>{task.title}</strong>
          <span>
            {task.project?.code} · {task.stage?.name || "Chưa có stage"} · {task.assignee?.name || "Chưa giao"}
          </span>
          {task.blocker ? <em>{task.blocker}</em> : null}
        </div>
      </div>
      <div className="task-controls">
        <PriorityBadge value={task.priority} />
        <StatusPill value={task.status} />
        <span className="due-date">
          <Clock3 size={15} />
          {task.dueDate}
        </span>
      </div>
    </div>
  );
}

function IntakeMessage({ message }) {
  return (
    <article className="intake-message">
      <div>
        <div className="intake-topline">
          <strong>{message.senderName}</strong>
          <span>{message.source?.displayName}</span>
        </div>
        <p>{message.content}</p>
        <div className="suggestion">
          <Sparkles size={15} />
          Gợi ý: {message.suggestedProject?.code || "Chưa rõ"} / {message.suggestedStage?.name || "Chưa rõ giai đoạn"}
        </div>
      </div>
      <div className="intake-actions">
        <button type="button">Tạo task</button>
        <button type="button" className="secondary">Gắn vào việc</button>
      </div>
    </article>
  );
}

const defaultProjectForm = {
  code: "",
  name: "",
  customer: "",
  ownerId: "",
  priority: "medium",
  status: "in_progress",
  dueDate: "",
  stageNames: "Tư vấn, Đấu thầu, Hợp đồng, Thanh toán, Triển khai, Nghiệm thu"
};

const defaultTaskForm = {
  projectId: "",
  stageId: "",
  title: "",
  description: "",
  assigneeId: "",
  priority: "medium",
  status: "todo",
  dueDate: ""
};

function QuickCreatePanel({ meta, projects, onCreated }) {
  const [departmentForm, setDepartmentForm] = useState({ name: "", code: "" });
  const [userForm, setUserForm] = useState({ name: "", email: "", departmentId: "" });
  const [projectForm, setProjectForm] = useState(defaultProjectForm);
  const [stageForm, setStageForm] = useState({ projectId: "", name: "", status: "todo", approvalRequired: false });
  const [taskForm, setTaskForm] = useState(defaultTaskForm);
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState("");

  const selectedTaskProject = projects.find((project) => String(project.id) === String(taskForm.projectId));
  const selectedStageProject = projects.find((project) => String(project.id) === String(stageForm.projectId));

  async function submitForm(event, type, path, payload, reset) {
    event.preventDefault();
    setSaving(type);
    setNotice("");

    try {
      await apiRequest(path, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      reset();
      setNotice("Đã lưu dữ liệu mới");
      await onCreated();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setSaving("");
    }
  }

  return (
    <section className="section quick-create" id="quick-create">
      <div className="section-header">
        <h2>Nhập dữ liệu nhanh</h2>
        {notice ? <span className="form-notice">{notice}</span> : null}
      </div>

      <div className="form-grid">
        <form
          className="data-form"
          onSubmit={(event) =>
            submitForm(event, "department", "/api/departments", departmentForm, () => setDepartmentForm({ name: "", code: "" }))
          }
        >
          <h3>Phòng ban</h3>
          <label>
            Tên phòng ban
            <input value={departmentForm.name} onChange={(event) => setDepartmentForm({ ...departmentForm, name: event.target.value })} required />
          </label>
          <label>
            Mã
            <input value={departmentForm.code} onChange={(event) => setDepartmentForm({ ...departmentForm, code: event.target.value })} />
          </label>
          <button type="submit" disabled={saving === "department"}>
            <Plus size={16} />
            Thêm phòng ban
          </button>
        </form>

        <form
          className="data-form"
          onSubmit={(event) => submitForm(event, "user", "/api/users", userForm, () => setUserForm({ name: "", email: "", departmentId: "" }))}
        >
          <h3>User</h3>
          <label>
            Tên
            <input value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} required />
          </label>
          <label>
            Email
            <input type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} required />
          </label>
          <label>
            Phòng ban
            <select value={userForm.departmentId} onChange={(event) => setUserForm({ ...userForm, departmentId: event.target.value })}>
              <option value="">Chưa chọn</option>
              {meta.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={saving === "user"}>
            <Plus size={16} />
            Thêm user
          </button>
        </form>

        <form
          className="data-form wide-form"
          onSubmit={(event) =>
            submitForm(
              event,
              "project",
              "/api/projects",
              {
                ...projectForm,
                stageNames: projectForm.stageNames
                  .split(",")
                  .map((stage) => stage.trim())
                  .filter(Boolean)
              },
              () => setProjectForm(defaultProjectForm)
            )
          }
        >
          <h3>Project</h3>
          <div className="form-columns">
            <label>
              Mã project
              <input value={projectForm.code} onChange={(event) => setProjectForm({ ...projectForm, code: event.target.value })} required />
            </label>
            <label>
              Tên project
              <input value={projectForm.name} onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })} required />
            </label>
            <label>
              Khách hàng
              <input value={projectForm.customer} onChange={(event) => setProjectForm({ ...projectForm, customer: event.target.value })} />
            </label>
            <label>
              Owner
              <select value={projectForm.ownerId} onChange={(event) => setProjectForm({ ...projectForm, ownerId: event.target.value })}>
                <option value="">Chưa chọn</option>
                {meta.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select value={projectForm.priority} onChange={(event) => setProjectForm({ ...projectForm, priority: event.target.value })}>
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Deadline
              <input type="date" value={projectForm.dueDate} onChange={(event) => setProjectForm({ ...projectForm, dueDate: event.target.value })} />
            </label>
          </div>
          <label>
            Các giai đoạn ban đầu
            <input value={projectForm.stageNames} onChange={(event) => setProjectForm({ ...projectForm, stageNames: event.target.value })} />
          </label>
          <button type="submit" disabled={saving === "project"}>
            <Plus size={16} />
            Tạo project
          </button>
        </form>

        <form
          className="data-form"
          onSubmit={(event) =>
            submitForm(event, "stage", "/api/stages", stageForm, () => setStageForm({ projectId: "", name: "", status: "todo", approvalRequired: false }))
          }
        >
          <h3>Stage</h3>
          <label>
            Project
            <select value={stageForm.projectId} onChange={(event) => setStageForm({ ...stageForm, projectId: event.target.value })} required>
              <option value="">Chọn project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} - {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tên stage
            <input value={stageForm.name} onChange={(event) => setStageForm({ ...stageForm, name: event.target.value })} required />
          </label>
          <label>
            Trạng thái
            <select value={stageForm.status} onChange={(event) => setStageForm({ ...stageForm, status: event.target.value })}>
              {["todo", "in_progress", "blocked", "done", "skipped"].map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status] || status}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={stageForm.approvalRequired}
              onChange={(event) => setStageForm({ ...stageForm, approvalRequired: event.target.checked })}
            />
            Cần approval
          </label>
          {selectedStageProject ? <p className="form-helper">{selectedStageProject.stages.length} stage hiện có</p> : null}
          <button type="submit" disabled={saving === "stage"}>
            <Plus size={16} />
            Thêm stage
          </button>
        </form>

        <form
          className="data-form wide-form"
          onSubmit={(event) => submitForm(event, "task", "/api/tasks", taskForm, () => setTaskForm(defaultTaskForm))}
        >
          <h3>Task</h3>
          <div className="form-columns">
            <label>
              Project
              <select value={taskForm.projectId} onChange={(event) => setTaskForm({ ...taskForm, projectId: event.target.value, stageId: "" })} required>
                <option value="">Chọn project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Stage
              <select value={taskForm.stageId} onChange={(event) => setTaskForm({ ...taskForm, stageId: event.target.value })}>
                <option value="">Chưa chọn</option>
                {(selectedTaskProject?.stages || []).map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Assignee
              <select value={taskForm.assigneeId} onChange={(event) => setTaskForm({ ...taskForm, assigneeId: event.target.value })}>
                <option value="">Chưa giao</option>
                {meta.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}>
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Trạng thái
              <select value={taskForm.status} onChange={(event) => setTaskForm({ ...taskForm, status: event.target.value })}>
                {["todo", "doing", "waiting", "blocked", "review", "done", "cancelled"].map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status] || status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Deadline
              <input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} />
            </label>
          </div>
          <label>
            Tiêu đề task
            <input value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required />
          </label>
          <label>
            Mô tả
            <textarea value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} rows={3} />
          </label>
          <button type="submit" disabled={saving === "task"}>
            <Plus size={16} />
            Tạo task
          </button>
        </form>
      </div>
    </section>
  );
}

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [meta, setMeta] = useState({ priorities: [], departments: [], users: [] });
  const [projects, setProjects] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    const [dashboardData, metaData, projectData] = await Promise.all([
      apiRequest("/api/dashboard"),
      apiRequest("/api/meta"),
      apiRequest("/api/projects")
    ]);
    setDashboard(dashboardData);
    setMeta(metaData);
    setProjects(projectData);
  }

  useEffect(() => {
    loadData().catch((err) => setError(err.message));
  }, []);

  const filteredProjects = useMemo(() => {
    if (!dashboard) return [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return dashboard.projects;

    return dashboard.projects.filter((project) =>
      [project.name, project.code, project.customer, project.owner?.name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [dashboard, query]);

  if (error) {
    return (
      <main className="error-state">
        <AlertTriangle size={28} />
        <h1>Không tải được dữ liệu</h1>
        <p>{error}</p>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="loading-state">
        <CircleDot size={28} />
        <p>Đang tải dashboard...</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <ShieldCheck size={28} />
          <div>
            <strong>Work Hub</strong>
            <span>Project control</span>
          </div>
        </div>

        <nav>
          <a className="active" href="#dashboard">Dashboard</a>
          <a href="#quick-create">Nhập dữ liệu</a>
          <a href="#projects">Projects</a>
          <a href="#tasks">Tasks</a>
          <a href="#intake">Work Intake</a>
          <a href="#sources">Teams Sources</a>
        </nav>
      </aside>

      <main className="content">
        <header className="page-header">
          <div>
            <span className="eyebrow">MVP quản lý giao việc</span>
            <h1>Theo dõi project, task, priority và nguồn việc từ Teams</h1>
          </div>
          <label className="search-box">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm project, khách hàng, owner" />
          </label>
        </header>

        <section className="stats-grid" id="dashboard">
          <StatCard icon={Layers3} label="Projects" value={dashboard.summary.projects} />
          <StatCard icon={CheckCircle2} label="Đang hoạt động" value={dashboard.summary.activeProjects} />
          <StatCard icon={AlertTriangle} label="Task vướng" value={dashboard.summary.blockedTasks} tone="danger" />
          <StatCard icon={Inbox} label="Message chờ phân loại" value={dashboard.summary.untriagedMessages} tone="warning" />
        </section>

        <section className="section" id="projects">
          <div className="section-header">
            <h2>Projects ưu tiên</h2>
            <a className="button-link" href="#quick-create">Tạo project</a>
          </div>
          <div className="project-grid">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => <ProjectCard key={project.id} project={project} />)
            ) : (
              <div className="empty-state">Chưa có project nào. Tạo project đầu tiên ở phần nhập dữ liệu nhanh.</div>
            )}
          </div>
        </section>

        <QuickCreatePanel meta={meta} projects={projects} onCreated={loadData} />

        <section className="section split-section">
          <div id="tasks">
            <div className="section-header">
              <h2>Task cần chú ý</h2>
            </div>
            <div className="task-list">
              {dashboard.priorityTasks.length > 0 ? (
                dashboard.priorityTasks.map((task) => <TaskRow key={task.id} task={task} />)
              ) : (
                <div className="empty-state">Chưa có task ưu tiên cao.</div>
              )}
            </div>
          </div>

          <div id="intake">
            <div className="section-header">
              <h2>Work Intake</h2>
              <MessageSquareText size={20} />
            </div>
            <div className="intake-list">
              {dashboard.workIntake.length > 0 ? (
                dashboard.workIntake.map((message) => <IntakeMessage key={message.id} message={message} />)
              ) : (
                <div className="empty-state">Chưa có message Teams chờ phân loại.</div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
