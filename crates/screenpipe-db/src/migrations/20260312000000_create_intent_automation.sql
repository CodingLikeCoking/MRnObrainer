-- Intent automation storage for oracle-first task extraction and worker dispatch.

CREATE TABLE IF NOT EXISTS task_episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint TEXT NOT NULL UNIQUE,
    started_at DATETIME NOT NULL,
    ended_at DATETIME NOT NULL,
    summary TEXT NOT NULL,
    primary_intent TEXT NOT NULL,
    app_name TEXT,
    window_title TEXT,
    browser_url TEXT,
    domain TEXT,
    confidence REAL NOT NULL DEFAULT 0,
    sensitive BOOLEAN NOT NULL DEFAULT 0,
    evidence_json TEXT NOT NULL DEFAULT '[]',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_episodes_started_at ON task_episodes(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_episodes_ended_at ON task_episodes(ended_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_episodes_app_name ON task_episodes(app_name);
CREATE INDEX IF NOT EXISTS idx_task_episodes_domain ON task_episodes(domain);

CREATE TABLE IF NOT EXISTS task_entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    value TEXT NOT NULL,
    normalized_value TEXT NOT NULL,
    display_value TEXT,
    sensitive BOOLEAN NOT NULL DEFAULT 0,
    sensitivity_reason TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity_type, normalized_value)
);

CREATE INDEX IF NOT EXISTS idx_task_entities_entity_type ON task_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_task_entities_normalized_value ON task_entities(normalized_value);

CREATE TABLE IF NOT EXISTS episode_entity_links (
    episode_id INTEGER NOT NULL,
    entity_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (episode_id, entity_id, role, source_type, source_id),
    FOREIGN KEY (episode_id) REFERENCES task_episodes(id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES task_entities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_episode_entity_links_episode_id ON episode_entity_links(episode_id);
CREATE INDEX IF NOT EXISTS idx_episode_entity_links_entity_id ON episode_entity_links(entity_id);
CREATE INDEX IF NOT EXISTS idx_episode_entity_links_source ON episode_entity_links(source_type, source_id);

CREATE TABLE IF NOT EXISTS automation_policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scope TEXT NOT NULL UNIQUE,
    execution_profile TEXT NOT NULL,
    run_window_policy TEXT NOT NULL,
    idle_threshold_seconds INTEGER NOT NULL DEFAULT 900,
    night_window_start_hour INTEGER,
    night_window_end_hour INTEGER,
    feature_enabled BOOLEAN NOT NULL DEFAULT 0,
    cloud_redaction_enabled BOOLEAN NOT NULL DEFAULT 1,
    fully_autonomous_warning_acknowledged BOOLEAN NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS automation_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    episode_id INTEGER,
    policy_scope TEXT NOT NULL,
    status TEXT NOT NULL,
    requires_approval BOOLEAN NOT NULL DEFAULT 1,
    run_after DATETIME,
    plan_json TEXT,
    approval_note TEXT,
    approved_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (episode_id) REFERENCES task_episodes(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_automation_requests_episode_id ON automation_requests(episode_id);
CREATE INDEX IF NOT EXISTS idx_automation_requests_status ON automation_requests(status);
CREATE INDEX IF NOT EXISTS idx_automation_requests_run_after ON automation_requests(run_after);

CREATE TABLE IF NOT EXISTS worker_outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    run_at DATETIME NOT NULL,
    payload_json TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    dispatched_at DATETIME,
    acknowledged_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES automation_requests(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_worker_outbox_status ON worker_outbox(status);
CREATE INDEX IF NOT EXISTS idx_worker_outbox_run_at ON worker_outbox(run_at);
CREATE INDEX IF NOT EXISTS idx_worker_outbox_status_run_at ON worker_outbox(status, run_at);
