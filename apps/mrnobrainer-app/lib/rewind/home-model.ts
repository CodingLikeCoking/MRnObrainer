export type RewindMainSection = {
  id: "home" | "timeline" | "pipes" | "workers" | "health";
  label: string;
};

export type RewindSettingsSection = {
  id:
    | "rewind"
    | "general"
    | "recording"
    | "ai"
    | "connections"
    | "shortcuts"
    | "disk-usage";
  label: string;
};

export type RewindAiProvider = "openai-chatgpt" | "openai" | "custom" | "native-ollama";
export type WorkflowExecutorId =
  | "local-pipe"
  | "local-openclaw"
  | "remote-openclaw"
  | "external-tool";
export type WorkflowExecutorLocality = "local" | "remote" | "external";
export type RewindClawStatus =
  | "idle"
  | "planning"
  | "running"
  | "awaiting-approval"
  | "paused"
  | "error"
  | "offline";
export type WorkflowAssignmentStatus =
  | "queued"
  | "planning"
  | "running"
  | "awaiting-approval"
  | "idle";

export type RewindDashboardWidget =
  | "goal"
  | "paperclip-office"
  | "capture-health"
  | "ask-ai"
  | "automations"
  | "daily-review"
  | "stats"
  | "branch-graph"
  | "timeline-preview";

export interface RewindDashboardPosition {
  x: number;
  y: number;
  [key: string]: number;
}

export interface RewindDashboardDeliverySettings {
  enabled: boolean;
}

export interface RewindTelegramDeliverySettings {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

export interface RewindDeliverySettings {
  dashboard: RewindDashboardDeliverySettings;
  telegram: RewindTelegramDeliverySettings;
}

export interface RewindSettingsState {
  goal: string;
  aiProvider: RewindAiProvider;
  trustedAutopilot: boolean;
  askBeforePrivilegedActions: boolean;
  allowedPaths: string[];
  rollbackRetentionDays: number;
  neverExpireRollback: boolean;
  dailyReviewPipeName: string;
  delivery: RewindDeliverySettings;
  dashboardLocationLocked: boolean;
  dashboardPosition: RewindDashboardPosition | null;
  visibleWidgets: RewindDashboardWidget[];
  widgetOrder: RewindDashboardWidget[];
  claws: RewindClawWorker[];
  workflowCatalog: WorkflowCatalogEntry[];
  workflowAssignments: WorkflowAssignment[];
  automationGuardrails: RewindAutomationGuardrails;
  paperclip: RewindPaperclipSettings;
}

export interface RewindTopApp {
  name: string;
  minutes: number;
}

export interface RewindDailyReviewSnapshot {
  dateKey: string;
  headline: string;
  oneLiner: string;
  narrativeSummary: string;
  topApps: string[];
  statusLabel: string;
}

export interface RewindAutomationWalkthroughStep {
  id: string;
  title: string;
  detail: string;
  timestampLabel: string;
  appName?: string;
  deviceLabel?: string;
}

export interface RewindAutomationOpportunity {
  id: string;
  title: string;
  summary: string;
  lane: "developer" | "personal-ops";
  privacyTier?: "local-first" | "remote-okay" | "external-review";
  plannerSummary?: string;
  recommendedExecutors?: WorkflowExecutorId[];
  evidenceSummary?: string;
  repetitionCount?: number;
  timeSavedMinutes?: number;
  confidence?: number;
  sourceDevices?: string[];
  recommendedSchedule?: string;
  riskLevel?: "low" | "medium";
  requiredPermissions?: string[];
  walkthrough?: RewindAutomationWalkthroughStep[];
}

export interface WorkflowCatalogEntry {
  id: WorkflowExecutorId;
  label: string;
  description: string;
  locality: WorkflowExecutorLocality;
}

export interface WorkflowAssignment {
  id: string;
  opportunityId: string;
  clawId: string;
  executorId: WorkflowExecutorId;
  status: WorkflowAssignmentStatus;
  approvalMode: "ask" | "trusted";
  modelPolicy: "local-first" | "oauth-allowed";
  summary?: string;
}

export interface RewindClawWorker {
  id: string;
  hostId: string;
  name: string;
  title: string;
  levelLabel: string;
  locationLabel: string;
  modelLabel: string;
  status: RewindClawStatus;
  currentTask: string;
  lastHeartbeatLabel: string;
  healthScore: number;
  executorPreference: WorkflowExecutorId[];
  role?: "oracle" | "worker";
  host?: string;
  user?: string;
  port?: number;
  authMode?: "ssh-key" | "password" | "unknown";
  importSource?: "openclaw-sync-config" | "ssh-discovery" | "manual";
}

export interface RewindAutomationGuardrails {
  preferLocalModels: boolean;
  oauthWarningDismissed: boolean;
  allowCloudBypass: boolean;
  nonTechnicalMode: boolean;
}

export interface RewindPaperclipSettings {
  enabled: boolean;
  baseUrl: string;
  apiToken: string;
  activeCompanyId: string;
  activeCompanyName: string;
  pollIntervalSec: number;
  backgroundPollIntervalSec: number;
}

export type PaperclipOfficeAgentStatus =
  | "idle"
  | "running"
  | "planning"
  | "awaiting-approval"
  | "paused"
  | "error"
  | "offline";

export interface PaperclipOfficeCompanySummary {
  id: string;
  name: string;
  activeAgents: number;
  idleAgents: number;
  runningAgents: number;
  pausedAgents: number;
  taskBacklog: number;
  taskInProgress: number;
  pendingApprovals: number;
  spendUsd: number;
  budgetUsd: number;
}

export interface PaperclipOfficeRun {
  id: string;
  status: string;
  invocationSource: string;
  triggerDetail: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  agentId: string;
  agentName: string;
  adapterType: string;
  issueId?: string | null;
}

export interface PaperclipOfficeAgent {
  id: string;
  name: string;
  title: string;
  role: string;
  status: PaperclipOfficeAgentStatus;
  currentTask: string;
  currentIssueId?: string | null;
  locationLabel: string;
  budgetMonthlyCents: number;
  spentMonthlyCents: number;
  lastHeartbeatLabel: string;
  adapterType: string;
  reportsTo?: string | null;
  activeRun?: PaperclipOfficeRun | null;
}

export interface PaperclipOfficeTask {
  id: string;
  identifier: string;
  title: string;
  status: string;
  priority: string;
  summary: string;
  assigneeAgentId?: string | null;
  assigneeName?: string | null;
  updatedAt?: string | null;
}

export interface PaperclipOfficeApproval {
  id: string;
  type: string;
  status: string;
  requestedByAgentId?: string | null;
  requestedByAgentName?: string | null;
  linkedIssueIds: string[];
  decisionNote?: string | null;
}

export interface PaperclipOfficeAdminState {
  mode: "idle" | "loading" | "ready" | "error";
  errorMessage?: string | null;
  lastSyncAt?: string | null;
}

export interface PaperclipOfficeSnapshot {
  company: PaperclipOfficeCompanySummary;
  agents: PaperclipOfficeAgent[];
  tasks: PaperclipOfficeTask[];
  approvals: PaperclipOfficeApproval[];
  runs: PaperclipOfficeRun[];
  admin: PaperclipOfficeAdminState;
}

export interface RewindDailyReviewState {
  installed: boolean;
  running: boolean;
  statusLabel: string;
  queueLabel: string;
  runtimeTargetLabel: string;
  lastRunLabel: string;
  lastRunStatusLabel: string;
  resultLabel: string;
  lastError?: string | null;
}

export interface RewindBranchBucket {
  id: string;
  label: string;
  intensity: 0 | 1 | 2 | 3;
  appName?: string;
  hasMedia?: boolean;
}

export interface RewindBranchLane {
  deviceId: string;
  label: string;
  platformLabel: string;
  freshnessLabel: string;
  summary: string;
  buckets: RewindBranchBucket[];
}

export interface RewindBranchGraphSnapshot {
  mergeStatusLabel: string;
  lanes: RewindBranchLane[];
}

export interface RewindHomeViewModel {
  goal: string;
  todaySummary: string;
  stats: {
    focusMinutes: number;
    xpEarned: number;
    level: number;
    streakDays: number;
  };
  topApps: RewindTopApp[];
  review?: RewindDailyReviewSnapshot;
  dailyReview: RewindDailyReviewState;
  automationOpportunities: RewindAutomationOpportunity[];
  branchGraph: RewindBranchGraphSnapshot;
  claws: RewindClawWorker[];
  workflowCatalog: WorkflowCatalogEntry[];
  workflowAssignments: WorkflowAssignment[];
  guardrails: RewindAutomationGuardrails;
  dashboardWidgets: RewindDashboardWidget[];
  paperclipOffice: PaperclipOfficeSnapshot | null;
}

export interface RewindHomeInput {
  goal: string;
  topApps: RewindTopApp[];
  focusMinutes: number;
  xpEarned: number;
  level: number;
  streakDays: number;
  review?: RewindDailyReviewSnapshot;
  pipeInstalled: boolean;
  pipeRunning?: boolean;
  pipeLastRunLabel?: string;
  pipeLastRunStatusLabel?: string;
  pipeQueueLabel?: string;
  pipeRuntimeTargetLabel?: string;
  pipeLastError?: string | null;
  branchGraph?: RewindBranchGraphSnapshot;
  automationOpportunities?: RewindAutomationOpportunity[];
  claws?: RewindClawWorker[];
  workflowCatalog?: WorkflowCatalogEntry[];
  workflowAssignments?: WorkflowAssignment[];
  guardrails?: RewindAutomationGuardrails;
  paperclipOffice?: PaperclipOfficeSnapshot | null;
}

export interface WorkflowPlanInput {
  title: string;
  summary: string;
  lane: "developer" | "personal-ops";
  goal: string;
  allowedPaths: string[];
  askBeforePrivilegedActions: boolean;
  steps?: string[];
}

export interface WorkflowPlanViewModel {
  title: string;
  summary: string;
  lane: "developer" | "personal-ops";
  scopeLabel: string;
  goal: string;
  steps: string[];
}

const DEV_APPS = new Set(["cursor", "terminal", "warp", "iterm", "vscode", "xcode"]);
const OPS_KEYWORDS = ["update", "investor", "advisor", "follow-up", "follow up", "recap"];

export function getDefaultWorkflowCatalog(): WorkflowCatalogEntry[] {
  return [
    {
      id: "local-pipe",
      label: "Local Pipe",
      description: "Best for passive local workflows.",
      locality: "local",
    },
    {
      id: "local-openclaw",
      label: "Local worker runtime",
      description: "Use a local worker runtime for always-on runs.",
      locality: "local",
    },
    {
      id: "remote-openclaw",
      label: "Remote worker runtime",
      description: "Dispatch work to a remote worker host.",
      locality: "remote",
    },
    {
      id: "external-tool",
      label: "External tool",
      description: "Fallback for verified MCP or webhook tools.",
      locality: "external",
    },
  ];
}

export function getDefaultClaws(): RewindClawWorker[] {
  return [
    {
      id: "claw-local",
      hostId: "host-local",
      name: "This Mac",
      title: "Oracle",
      levelLabel: "Lv. 1",
      locationLabel: "Oracle on this Mac",
      modelLabel: "Local model",
      status: "idle",
      currentTask: "Authoritative local context stays here",
      lastHeartbeatLabel: "Just now",
      healthScore: 96,
      executorPreference: ["local-pipe", "local-openclaw", "remote-openclaw", "external-tool"],
      role: "oracle",
    },
  ];
}

export function getDefaultAutomationGuardrails(): RewindAutomationGuardrails {
  return {
    preferLocalModels: true,
    oauthWarningDismissed: false,
    allowCloudBypass: true,
    nonTechnicalMode: true,
  };
}

export function getDefaultPaperclipSettings(): RewindPaperclipSettings {
  return {
    enabled: false,
    baseUrl: "http://localhost:3100",
    apiToken: "",
    activeCompanyId: "",
    activeCompanyName: "",
    pollIntervalSec: 5,
    backgroundPollIntervalSec: 20,
  };
}

export function buildRewindMainSections(): RewindMainSection[] {
  return [
    { id: "home", label: "Ask" },
    { id: "timeline", label: "Timeline" },
    { id: "pipes", label: "Automations" },
    { id: "workers", label: "Workers" },
    { id: "health", label: "Health" },
  ];
}

export function buildRewindSettingsSections(): RewindSettingsSection[] {
  return [
    { id: "rewind", label: "MRnObrainer" },
    { id: "general", label: "General" },
    { id: "recording", label: "Recording" },
    { id: "ai", label: "AI" },
    { id: "connections", label: "Connections" },
    { id: "shortcuts", label: "Shortcuts" },
    { id: "disk-usage", label: "Disk usage" },
  ];
}

export function getDefaultDashboardWidgets(): RewindDashboardWidget[] {
  return [
    "goal",
    "ask-ai",
    "capture-health",
    "automations",
    "daily-review",
  ];
}

export function getDefaultShowShortcut(platformName: string): string {
  return platformName === "windows" ? "Alt+Shift+O" : "Shift+Super+O";
}

export function getDefaultRewindSettings(): RewindSettingsState {
  return {
    goal: "",
    aiProvider: "native-ollama",
    trustedAutopilot: false,
    askBeforePrivilegedActions: true,
    allowedPaths: [],
    rollbackRetentionDays: 30,
    neverExpireRollback: false,
    dailyReviewPipeName: "rewind-daily-review",
    delivery: {
      dashboard: {
        enabled: true,
      },
      telegram: {
        enabled: false,
        botToken: "",
        chatId: "",
      },
    },
    dashboardLocationLocked: false,
    dashboardPosition: null,
    visibleWidgets: getDefaultDashboardWidgets(),
    widgetOrder: getDefaultDashboardWidgets(),
    claws: getDefaultClaws(),
    workflowCatalog: getDefaultWorkflowCatalog(),
    workflowAssignments: [],
    automationGuardrails: getDefaultAutomationGuardrails(),
    paperclip: getDefaultPaperclipSettings(),
  };
}

export function buildRewindHomeViewModel(input: RewindHomeInput): RewindHomeViewModel {
  const topApps = input.topApps.slice(0, 4);
  const appSummary = topApps.length > 0
    ? topApps.map((app) => app.name).join(", ")
    : "your recorded work";

  return {
    goal: input.goal,
    todaySummary: `Today centered on ${appSummary}.`,
    stats: {
      focusMinutes: input.focusMinutes,
      xpEarned: input.xpEarned,
      level: input.level,
      streakDays: input.streakDays,
    },
    topApps,
    review: input.review,
    dailyReview: {
      installed: input.pipeInstalled,
      running: input.pipeRunning ?? false,
      statusLabel: input.pipeInstalled ? (input.pipeRunning ? "Running now" : "Ready to run") : "Install required",
      queueLabel:
        input.pipeQueueLabel ||
        (input.pipeInstalled
          ? input.pipeRunning
            ? "Running on this Mac"
            : "Waiting for you"
          : "Install the workflow"),
      runtimeTargetLabel: input.pipeRuntimeTargetLabel || "This Mac · Local pipe",
      lastRunLabel: input.pipeLastRunLabel || (input.pipeInstalled ? "Not run yet" : "No local run yet"),
      lastRunStatusLabel:
        input.pipeLastRunStatusLabel ||
        (input.pipeInstalled ? "No result yet" : "Install required"),
      resultLabel: "Dashboard inbox",
      lastError: input.pipeLastError,
    },
    automationOpportunities:
      input.automationOpportunities && input.automationOpportunities.length > 0
        ? input.automationOpportunities
        : buildAutomationOpportunities({
            goal: input.goal,
            topApps: input.topApps,
            review: input.review,
          }),
    branchGraph: input.branchGraph || {
      mergeStatusLabel: "Local-only live view",
      lanes: [],
    },
    claws: input.claws || getDefaultClaws(),
    workflowCatalog: input.workflowCatalog || getDefaultWorkflowCatalog(),
    workflowAssignments: input.workflowAssignments || [],
    guardrails: input.guardrails || getDefaultAutomationGuardrails(),
    dashboardWidgets: getDefaultDashboardWidgets(),
    paperclipOffice: input.paperclipOffice || null,
  };
}

function buildAutomationOpportunities({
  goal,
  topApps,
  review,
}: {
  goal: string;
  topApps: RewindTopApp[];
  review?: RewindDailyReviewSnapshot;
}): RewindAutomationOpportunity[] {
  const opportunities: RewindAutomationOpportunity[] = [];
  const lowerGoal = goal.toLowerCase();
  const hasDevSignal = topApps.some((app) => DEV_APPS.has(app.name.toLowerCase()));
  const hasOpsSignal = OPS_KEYWORDS.some((keyword) => lowerGoal.includes(keyword)) || Boolean(review);

  if (hasDevSignal) {
    opportunities.push({
      id: "developer-workflow",
      title: "Turn today’s dev loop into a workflow",
      summary: "Package the repo, env, and run steps into one repeatable flow.",
      lane: "developer",
      privacyTier: "local-first",
      plannerSummary: "Plan locally, then recommend the safest executor before assigning the quest.",
      recommendedExecutors: ["local-pipe", "local-openclaw", "remote-openclaw", "external-tool"],
    });
  }

  if (hasOpsSignal) {
    opportunities.push({
      id: "founder-update",
      title: "Automate your founder update",
      summary: "Turn today’s product and communication signals into a repeatable end-of-day update.",
      lane: "personal-ops",
      privacyTier: "local-first",
      plannerSummary: "Start with a local recap, then escalate to a remote claw only if the workflow needs it.",
      recommendedExecutors: ["local-pipe", "local-openclaw", "remote-openclaw", "external-tool"],
    });
  }

  return opportunities;
}

export function createWorkflowPlan(input: WorkflowPlanInput): WorkflowPlanViewModel {
  const defaultSteps = [
    input.lane === "developer"
      ? "Review the recent local development flow and repeated setup steps"
      : "Review today’s product and communication activity",
    input.lane === "developer"
      ? "Turn the repeated repo and environment work into one guided workflow"
      : "Draft a clean end-of-day update from the important signals",
    input.askBeforePrivilegedActions
      ? "Ask before any privileged or out-of-scope action"
      : "Operate within the approved local scope automatically",
    "Summarize what changed in simple language when complete",
  ];
  const steps =
    input.steps && input.steps.length > 0
      ? Array.from(new Set([...input.steps, ...defaultSteps.slice(2)]))
      : defaultSteps;

  return {
    title: input.title,
    summary: input.summary,
    lane: input.lane,
    goal: input.goal,
    scopeLabel: input.allowedPaths.length > 0 ? "Limited to approved folders" : "No folder limits configured",
    steps,
  };
}
