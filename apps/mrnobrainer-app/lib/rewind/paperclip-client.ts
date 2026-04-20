import type {
  PaperclipOfficeAgent,
  PaperclipOfficeAgentStatus,
  PaperclipOfficeApproval,
  PaperclipOfficeRun,
  PaperclipOfficeSnapshot,
  PaperclipOfficeTask,
  RewindPaperclipSettings,
} from "@/lib/rewind/home-model";

type JsonRecord = Record<string, unknown>;

export class PaperclipApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PaperclipApiError";
    this.status = status;
  }
}

export type PaperclipConnectionConfig = Pick<
  RewindPaperclipSettings,
  "baseUrl" | "apiToken" | "activeCompanyId" | "activeCompanyName"
>;

export type PaperclipActionPayload = {
  source?: "timer" | "assignment" | "on_demand" | "automation";
  triggerDetail?: "manual" | "ping" | "callback" | "system";
  reason?: string | null;
  payload?: Record<string, unknown> | null;
  idempotencyKey?: string | null;
};

export type PaperclipIssuePatch = {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeAgentId?: string | null;
  projectId?: string | null;
  goalId?: string | null;
  parentId?: string | null;
  billingCode?: string | null;
  comment?: string;
};

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function formatCurrencyFromCents(cents: number): number {
  return Math.round((cents / 100) * 100) / 100;
}

function formatRelativeLabel(value?: string | null): string {
  if (!value) return "No recent heartbeat";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No recent heartbeat";

  const deltaMs = Date.now() - date.getTime();
  if (deltaMs < 60_000) {
    return `${Math.max(1, Math.round(deltaMs / 1000))}s ago`;
  }
  if (deltaMs < 3_600_000) {
    return `${Math.max(1, Math.round(deltaMs / 60_000))}m ago`;
  }
  if (deltaMs < 86_400_000) {
    return `${Math.max(1, Math.round(deltaMs / 3_600_000))}h ago`;
  }
  return `${Math.max(1, Math.round(deltaMs / 86_400_000))}d ago`;
}

function normalizeAgentStatus(value: unknown): PaperclipOfficeAgentStatus {
  const raw = asString(value, "idle").toLowerCase();
  if (raw === "running" || raw === "active") return "running";
  if (raw === "planning") return "planning";
  if (raw === "awaiting-approval" || raw === "pending_approval") return "awaiting-approval";
  if (raw === "paused") return "paused";
  if (raw === "error" || raw === "failed") return "error";
  if (raw === "offline" || raw === "terminated") return "offline";
  return "idle";
}

function deriveLocationLabel(adapterType: string): string {
  const normalized = adapterType.toLowerCase();
  if (normalized.includes("openclaw")) return "Remote worker gateway";
  if (normalized.includes("codex")) return "Codex local";
  if (normalized.includes("claude")) return "Claude local";
  if (normalized.includes("cursor")) return "Cursor local";
  if (normalized.includes("http")) return "Remote HTTP runtime";
  if (normalized.includes("process")) return "Local process";
  return "Paperclip runtime";
}

export function normalizePaperclipBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/api")) {
    return trimmed.slice(0, -4);
  }
  return trimmed;
}

export function paperclipApiUrl(baseUrl: string, path: string): string {
  return `${normalizePaperclipBaseUrl(baseUrl)}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `paperclip request failed (${response.status})`;
    try {
      const errorJson = (await response.json()) as JsonRecord;
      if (typeof errorJson.error === "string") {
        message = errorJson.error;
      }
    } catch {
      // ignore parse errors
    }
    throw new PaperclipApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export function buildPaperclipOfficeSnapshot(args: {
  config: PaperclipConnectionConfig;
  dashboard: unknown;
  agents: unknown;
  org: unknown;
  runs: unknown;
  issues: unknown;
  approvals: unknown;
  errorMessage?: string | null;
}): PaperclipOfficeSnapshot {
  const dashboard = asRecord(args.dashboard);
  const agentCounts = asRecord(dashboard.agentCounts);
  const taskCounts = asRecord(dashboard.taskCounts);
  const costSummary = asRecord(dashboard.costSummary);

  const runs = asArray<JsonRecord>(args.runs).map<PaperclipOfficeRun>((run) => ({
    id: asString(run.id),
    status: asString(run.status),
    invocationSource: asString(run.invocationSource),
    triggerDetail: typeof run.triggerDetail === "string" ? run.triggerDetail : null,
    startedAt: typeof run.startedAt === "string" ? run.startedAt : null,
    finishedAt: typeof run.finishedAt === "string" ? run.finishedAt : null,
    createdAt: asString(run.createdAt),
    agentId: asString(run.agentId),
    agentName: asString(run.agentName),
    adapterType: asString(run.adapterType),
    issueId: typeof run.issueId === "string" ? run.issueId : null,
  }));

  const tasks = asArray<JsonRecord>(args.issues).map<PaperclipOfficeTask>((issue) => {
    const assignee = asRecord(issue.assignee);
    return {
      id: asString(issue.id),
      identifier: asString(issue.identifier, asString(issue.id)),
      title: asString(issue.title, "Untitled task"),
      status: asString(issue.status, "todo"),
      priority: asString(issue.priority, "normal"),
      summary: asString(issue.description || issue.comment, "No summary yet."),
      assigneeAgentId:
        typeof issue.assigneeAgentId === "string"
          ? issue.assigneeAgentId
          : typeof assignee.id === "string"
            ? asString(assignee.id)
            : null,
      assigneeName:
        typeof assignee.name === "string"
          ? asString(assignee.name)
          : typeof issue.assigneeName === "string"
            ? asString(issue.assigneeName)
            : null,
      updatedAt:
        typeof issue.updatedAt === "string"
          ? issue.updatedAt
          : typeof issue.createdAt === "string"
            ? issue.createdAt
            : null,
    };
  });

  const approvals = asArray<JsonRecord>(args.approvals).map<PaperclipOfficeApproval>((approval) => ({
    id: asString(approval.id),
    type: asString(approval.type, "approval"),
    status: asString(approval.status, "pending"),
    requestedByAgentId:
      typeof approval.requestedByAgentId === "string" ? approval.requestedByAgentId : null,
    requestedByAgentName:
      typeof approval.requestedByAgentName === "string" ? approval.requestedByAgentName : null,
    linkedIssueIds: asArray<JsonRecord>(approval.issues).map((issue) => asString(issue.id)).filter(Boolean),
    decisionNote: typeof approval.decisionNote === "string" ? approval.decisionNote : null,
  }));

  const orgRoot = asRecord(args.org);
  const orgNodes =
    asArray<JsonRecord>(args.org).length > 0
      ? asArray<JsonRecord>(args.org)
      : asArray<JsonRecord>(orgRoot.nodes).length > 0
        ? asArray<JsonRecord>(orgRoot.nodes)
        : asArray<JsonRecord>(orgRoot.agents);
  const orgOrder = new Map<string, number>();
  const orgReportsTo = new Map<string, string | null>();

  orgNodes.forEach((node, index) => {
    const agentId =
      asString(node.agentId) ||
      asString(node.id) ||
      asString(asRecord(node.agent).id);
    if (!agentId) return;

    orgOrder.set(agentId, index);
    orgReportsTo.set(
      agentId,
      asString(node.reportsTo) ||
        asString(node.parentAgentId) ||
        asString(node.managerAgentId) ||
        asString(asRecord(node.parent).id) ||
        null
    );
  });

  const agents = asArray<JsonRecord>(args.agents).map<PaperclipOfficeAgent>((agent) => {
    const agentId = asString(agent.id);
    const activeRun =
      runs.find((run) => run.agentId === agentId && (run.status === "running" || run.status === "queued")) || null;
    const assignedTask =
      tasks.find((task) => task.assigneeAgentId === agentId && task.status === "in_progress") ||
      tasks.find((task) => task.assigneeAgentId === agentId && task.status === "todo") ||
      null;
    return {
      id: agentId,
      name: asString(agent.name, "Agent"),
      title: asString(agent.title, "Agent"),
      role: asString(agent.role, "worker"),
      status: normalizeAgentStatus(agent.status),
      currentTask:
        assignedTask?.title ||
        (activeRun?.issueId ? `Running issue ${activeRun.issueId}` : "Free for assignment"),
      currentIssueId: activeRun?.issueId || assignedTask?.id || null,
      locationLabel: deriveLocationLabel(asString(agent.adapterType, "runtime")),
      budgetMonthlyCents: asNumber(agent.budgetMonthlyCents),
      spentMonthlyCents: asNumber(agent.spentMonthlyCents),
      lastHeartbeatLabel: formatRelativeLabel(
        asString(agent.lastHeartbeatAt) || activeRun?.startedAt || activeRun?.createdAt
      ),
      adapterType: asString(agent.adapterType, "runtime"),
      reportsTo:
        typeof agent.reportsTo === "string"
          ? agent.reportsTo
          : orgReportsTo.get(agentId) || null,
      activeRun,
    };
  }).sort((left, right) => {
    const leftOrder = orgOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = orgOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.name.localeCompare(right.name);
  });

  return {
    company: {
      id: args.config.activeCompanyId,
      name:
        asString(dashboard.companyName) ||
        args.config.activeCompanyName ||
        args.config.activeCompanyId ||
        "Paperclip company",
      activeAgents:
        asNumber(agentCounts.active) ||
        agents.filter((agent) => agent.status !== "offline" && agent.status !== "paused").length,
      idleAgents: asNumber(agentCounts.idle) || agents.filter((agent) => agent.status === "idle").length,
      runningAgents:
        asNumber(agentCounts.running) || agents.filter((agent) => agent.status === "running").length,
      pausedAgents:
        asNumber(agentCounts.paused) || agents.filter((agent) => agent.status === "paused").length,
      taskBacklog: asNumber(taskCounts.backlog) || tasks.filter((task) => task.status === "todo").length,
      taskInProgress:
        asNumber(taskCounts.in_progress) || tasks.filter((task) => task.status === "in_progress").length,
      pendingApprovals:
        asNumber(dashboard.pendingApprovals) || approvals.filter((approval) => approval.status === "pending").length,
      spendUsd:
        asNumber(costSummary.currentMonthUsd) ||
        formatCurrencyFromCents(agents.reduce((total, agent) => total + agent.spentMonthlyCents, 0)),
      budgetUsd:
        asNumber(costSummary.budgetUsd) ||
        formatCurrencyFromCents(agents.reduce((total, agent) => total + agent.budgetMonthlyCents, 0)),
    },
    agents,
    tasks: tasks.slice(0, 8),
    approvals: approvals.slice(0, 6),
    runs,
    admin: {
      mode: args.errorMessage ? "error" : "ready",
      errorMessage: args.errorMessage || null,
      lastSyncAt: new Date().toISOString(),
    },
  };
}

export class PaperclipClient {
  private readonly config: PaperclipConnectionConfig;

  constructor(config: PaperclipConnectionConfig) {
    this.config = config;
  }

  isConfigured() {
    return Boolean(
      this.config.baseUrl.trim() && this.config.apiToken.trim() && this.config.activeCompanyId.trim()
    );
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    if (!this.isConfigured()) {
      throw new PaperclipApiError("Paperclip is not configured", 400);
    }

    const response = await fetch(paperclipApiUrl(this.config.baseUrl, path), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiToken}`,
        ...(init?.headers || {}),
      },
    });

    return readJsonResponse<T>(response);
  }

  async fetchOfficeSnapshot(): Promise<PaperclipOfficeSnapshot> {
    const companyId = this.config.activeCompanyId;
    const [dashboard, agents, org, runs, issues, approvals] = await Promise.allSettled([
      this.request(`/companies/${encodeURIComponent(companyId)}/dashboard`),
      this.request(`/companies/${encodeURIComponent(companyId)}/agents`),
      this.request(`/companies/${encodeURIComponent(companyId)}/org`),
      this.request(`/companies/${encodeURIComponent(companyId)}/live-runs`),
      this.request(
        `/companies/${encodeURIComponent(companyId)}/issues?status=${encodeURIComponent("todo,in_progress,blocked")}`
      ),
      this.request(`/companies/${encodeURIComponent(companyId)}/approvals?status=pending`),
    ]);

    const results = [dashboard, agents, org, runs, issues, approvals];
    const failures = results
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => (result.reason instanceof Error ? result.reason.message : String(result.reason)));

    const criticalResults = [dashboard, agents, org];
    const criticalFailure = criticalResults.find(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    );

    if (results.every((result) => result.status === "rejected") && criticalFailure) {
      throw criticalFailure.reason;
    }

    if (criticalResults.every((result) => result.status === "rejected") && criticalFailure) {
      throw criticalFailure.reason;
    }

    return buildPaperclipOfficeSnapshot({
      config: this.config,
      dashboard: dashboard.status === "fulfilled" ? dashboard.value : {},
      agents: agents.status === "fulfilled" ? agents.value : [],
      org: org.status === "fulfilled" ? org.value : [],
      runs: runs.status === "fulfilled" ? runs.value : [],
      issues: issues.status === "fulfilled" ? issues.value : [],
      approvals: approvals.status === "fulfilled" ? approvals.value : [],
      errorMessage: failures.length > 0 ? failures.join(" | ") : null,
    });
  }

  pauseAgent(agentId: string) {
    return this.request(`/agents/${encodeURIComponent(agentId)}/pause`, { method: "POST", body: "{}" });
  }

  resumeAgent(agentId: string) {
    return this.request(`/agents/${encodeURIComponent(agentId)}/resume`, { method: "POST", body: "{}" });
  }

  invokeHeartbeat(agentId: string) {
    return this.request(`/agents/${encodeURIComponent(agentId)}/heartbeat/invoke`, {
      method: "POST",
      body: "{}",
    });
  }

  wakeupAgent(agentId: string, data: PaperclipActionPayload = {}) {
    return this.request(`/agents/${encodeURIComponent(agentId)}/wakeup`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  createAgent(data: Record<string, unknown>) {
    return this.request(`/companies/${encodeURIComponent(this.config.activeCompanyId)}/agents`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  hireAgent(data: Record<string, unknown>) {
    return this.request(`/companies/${encodeURIComponent(this.config.activeCompanyId)}/agent-hires`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateAgent(agentId: string, data: Record<string, unknown>) {
    return this.request(`/agents/${encodeURIComponent(agentId)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  createIssue(data: Record<string, unknown>) {
    return this.request(`/companies/${encodeURIComponent(this.config.activeCompanyId)}/issues`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateIssue(issueId: string, data: PaperclipIssuePatch) {
    return this.request(`/issues/${encodeURIComponent(issueId)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  addIssueComment(issueId: string, body: string) {
    return this.request(`/issues/${encodeURIComponent(issueId)}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  }

  checkoutIssue(issueId: string, agentId: string) {
    return this.request(`/issues/${encodeURIComponent(issueId)}/checkout`, {
      method: "POST",
      body: JSON.stringify({
        agentId,
        expectedStatuses: ["todo", "backlog", "blocked"],
      }),
    });
  }

  releaseIssue(issueId: string) {
    return this.request(`/issues/${encodeURIComponent(issueId)}/release`, {
      method: "POST",
      body: "{}",
    });
  }

  approveApproval(approvalId: string, decisionNote: string) {
    return this.request(`/approvals/${encodeURIComponent(approvalId)}/approve`, {
      method: "POST",
      body: JSON.stringify({ decisionNote }),
    });
  }

  rejectApproval(approvalId: string, decisionNote: string) {
    return this.request(`/approvals/${encodeURIComponent(approvalId)}/reject`, {
      method: "POST",
      body: JSON.stringify({ decisionNote }),
    });
  }

  requestApprovalRevision(approvalId: string, decisionNote: string) {
    return this.request(`/approvals/${encodeURIComponent(approvalId)}/request-revision`, {
      method: "POST",
      body: JSON.stringify({ decisionNote }),
    });
  }

  resubmitApproval(approvalId: string, payload: Record<string, unknown>) {
    return this.request(`/approvals/${encodeURIComponent(approvalId)}/resubmit`, {
      method: "POST",
      body: JSON.stringify({ payload }),
    });
  }
}
