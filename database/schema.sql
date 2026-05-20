CREATE TABLE IF NOT EXISTS departments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(80) NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  microsoft_user_id VARCHAR(255) NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  department_id BIGINT UNSIGNED NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS projects (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NULL,
  owner_user_id BIGINT UNSIGNED NULL,
  priority ENUM('critical', 'high', 'medium', 'low') NOT NULL DEFAULT 'medium',
  priority_reason TEXT NULL,
  status ENUM('draft', 'in_progress', 'blocked', 'paused', 'done', 'cancelled') NOT NULL DEFAULT 'draft',
  due_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  project_role VARCHAR(120) NOT NULL DEFAULT 'member',
  PRIMARY KEY (project_id, user_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_stages (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  stage_order INT NOT NULL DEFAULT 0,
  status ENUM('todo', 'in_progress', 'blocked', 'done', 'skipped') NOT NULL DEFAULT 'todo',
  approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  stage_id BIGINT UNSIGNED NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  assignee_user_id BIGINT UNSIGNED NULL,
  priority ENUM('critical', 'high', 'medium', 'low') NOT NULL DEFAULT 'medium',
  priority_reason TEXT NULL,
  status ENUM('todo', 'doing', 'waiting', 'blocked', 'review', 'done', 'cancelled') NOT NULL DEFAULT 'todo',
  due_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (stage_id) REFERENCES project_stages(id) ON DELETE SET NULL,
  FOREIGN KEY (assignee_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS task_blockers (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  task_id BIGINT UNSIGNED NOT NULL,
  description TEXT NOT NULL,
  status ENUM('open', 'resolved') NOT NULL DEFAULT 'open',
  created_by_user_id BIGINT UNSIGNED NULL,
  resolved_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (resolved_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS teams_sources (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  source_type ENUM('team', 'channel', 'group_chat', 'private_chat', 'meeting_chat') NOT NULL,
  microsoft_team_id VARCHAR(255) NULL,
  microsoft_channel_id VARCHAR(255) NULL,
  microsoft_chat_id VARCHAR(255) NULL,
  display_name VARCHAR(255) NOT NULL,
  mapping_mode ENUM('project', 'stage', 'work_intake') NOT NULL DEFAULT 'work_intake',
  project_id BIGINT UNSIGNED NULL,
  stage_id BIGINT UNSIGNED NULL,
  last_synced_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (stage_id) REFERENCES project_stages(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS teams_messages (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  teams_source_id BIGINT UNSIGNED NOT NULL,
  microsoft_message_id VARCHAR(255) NOT NULL,
  reply_to_microsoft_message_id VARCHAR(255) NULL,
  sender_microsoft_user_id VARCHAR(255) NULL,
  sender_display_name VARCHAR(255) NULL,
  content_html MEDIUMTEXT NULL,
  content_text MEDIUMTEXT NULL,
  raw_payload JSON NULL,
  sent_at DATETIME NOT NULL,
  last_modified_at DATETIME NULL,
  triage_status ENUM('untriaged', 'suggested', 'mapped', 'ignored') NOT NULL DEFAULT 'untriaged',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_source_message (teams_source_id, microsoft_message_id),
  FOREIGN KEY (teams_source_id) REFERENCES teams_sources(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS message_task_links (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  teams_message_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NULL,
  stage_id BIGINT UNSIGNED NULL,
  task_id BIGINT UNSIGNED NULL,
  link_type ENUM('created_task', 'related', 'progress_update', 'blocker', 'decision') NOT NULL DEFAULT 'related',
  confidence DECIMAL(5, 4) NULL,
  linked_by_user_id BIGINT UNSIGNED NULL,
  linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teams_message_id) REFERENCES teams_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (stage_id) REFERENCES project_stages(id) ON DELETE SET NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (linked_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS approvals (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  stage_id BIGINT UNSIGNED NOT NULL,
  requested_by_user_id BIGINT UNSIGNED NULL,
  approved_by_user_id BIGINT UNSIGNED NULL,
  status ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  note TEXT NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at DATETIME NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (stage_id) REFERENCES project_stages(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(120) NOT NULL,
  before_payload JSON NULL,
  after_payload JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);
