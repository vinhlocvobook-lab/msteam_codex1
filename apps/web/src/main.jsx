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
  todo: "Chưa làm",
  doing: "Đang xử lý",
  waiting: "Đang chờ",
  blocked: "Đang vướng",
  done: "Hoàn tất",
  in_progress: "Đang chạy"
};

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
          {project.owner?.name}
        </span>
        <span>
          <Layers3 size={16} />
          {project.currentStage?.name}
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
            {task.project?.code} · {task.stage?.name} · {task.assignee?.name}
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

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/dashboard`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Không thể tải dashboard");
        }

        return response.json();
      })
      .then(setDashboard)
      .catch((err) => setError(err.message));
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
            <button type="button">Tạo project</button>
          </div>
          <div className="project-grid">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>

        <section className="section split-section">
          <div id="tasks">
            <div className="section-header">
              <h2>Task cần chú ý</h2>
            </div>
            <div className="task-list">
              {dashboard.priorityTasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          </div>

          <div id="intake">
            <div className="section-header">
              <h2>Work Intake</h2>
              <MessageSquareText size={20} />
            </div>
            <div className="intake-list">
              {dashboard.workIntake.map((message) => (
                <IntakeMessage key={message.id} message={message} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
