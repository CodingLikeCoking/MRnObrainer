"use client";

import { useEffect, useMemo, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  BellRing,
  Briefcase,
  Building2,
  CheckCircle2,
  CircleOff,
  Loader2,
  PauseCircle,
  PlayCircle,
  Rocket,
  ShieldAlert,
  Sparkles,
  UserPlus,
  Zap,
} from "lucide-react";

import type {
  PaperclipOfficeAgent,
  PaperclipOfficeApproval,
  PaperclipOfficeSnapshot,
  PaperclipOfficeTask,
  RewindAutomationOpportunity,
  RewindClawWorker,
} from "@/lib/rewind/home-model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ActionResult = { ok: boolean; error?: string } | void;

type PaperclipOfficeHeroProps = {
  paperclipBaseUrl: string;
  office: PaperclipOfficeSnapshot | null;
  fallbackClaws: RewindClawWorker[];
  automationOpportunities: RewindAutomationOpportunity[];
  onAssignOpportunity?: (opportunityId: string, targetId: string) => Promise<void> | void;
  onPauseAgent?: (agentId: string) => Promise<ActionResult>;
  onResumeAgent?: (agentId: string) => Promise<ActionResult>;
  onInvokeHeartbeat?: (agentId: string) => Promise<ActionResult>;
  onWakeAgent?: (agentId: string) => Promise<ActionResult>;
  onCreateIssue?: (payload: Record<string, unknown>) => Promise<ActionResult>;
  onUpdateIssue?: (issueId: string, payload: Record<string, unknown>) => Promise<ActionResult>;
  onAddIssueComment?: (issueId: string, body: string) => Promise<ActionResult>;
  onCheckoutIssue?: (issueId: string, agentId: string) => Promise<ActionResult>;
  onReleaseIssue?: (issueId: string) => Promise<ActionResult>;
  onApproveApproval?: (approvalId: string, note: string) => Promise<ActionResult>;
  onRejectApproval?: (approvalId: string, note: string) => Promise<ActionResult>;
  onRequestApprovalRevision?: (approvalId: string, note: string) => Promise<ActionResult>;
  onResubmitApproval?: (approvalId: string, payload: Record<string, unknown>) => Promise<ActionResult>;
  onCreateAgent?: (payload: Record<string, unknown>) => Promise<ActionResult>;
  onHireAgent?: (payload: Record<string, unknown>) => Promise<ActionResult>;
  onUpdateAgent?: (agentId: string, payload: Record<string, unknown>) => Promise<ActionResult>;
};

type StationLayout = {
  agent: PaperclipOfficeAgent;
  left: string;
  top: string;
};

const STATION_POSITIONS = [
  { left: "14%", top: "22%" },
  { left: "36%", top: "16%" },
  { left: "60%", top: "22%" },
  { left: "18%", top: "56%" },
  { left: "44%", top: "52%" },
  { left: "68%", top: "56%" },
];

const STATUS_TONE: Record<
  PaperclipOfficeAgent["status"],
  { badge: string; floor: string; label: string }
> = {
  idle: {
    badge: "bg-slate-500/15 text-slate-700 border-slate-500/20",
    floor: "from-slate-200 to-slate-300",
    label: "Idle",
  },
  running: {
    badge: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
    floor: "from-emerald-200 to-emerald-300",
    label: "Running",
  },
  planning: {
    badge: "bg-sky-500/15 text-sky-700 border-sky-500/20",
    floor: "from-sky-200 to-sky-300",
    label: "Planning",
  },
  "awaiting-approval": {
    badge: "bg-amber-500/15 text-amber-700 border-amber-500/20",
    floor: "from-amber-200 to-amber-300",
    label: "Awaiting approval",
  },
  paused: {
    badge: "bg-rose-500/15 text-rose-700 border-rose-500/20",
    floor: "from-rose-200 to-rose-300",
    label: "Paused",
  },
  error: {
    badge: "bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/20",
    floor: "from-fuchsia-200 to-fuchsia-300",
    label: "Error",
  },
  offline: {
    badge: "bg-neutral-500/15 text-neutral-700 border-neutral-500/20",
    floor: "from-neutral-200 to-neutral-300",
    label: "Offline",
  },
};

function shortTaskLabel(value: string) {
  return value.length > 42 ? `${value.slice(0, 39)}...` : value;
}

async function openPaperclip(baseUrl: string) {
  const target = baseUrl.trim();
  if (!target) return;
  await openUrl(target);
}

async function runAction(action?: () => Promise<ActionResult>) {
  if (!action) return { ok: false, error: "Action is unavailable." };
  const result = await action();
  return result ?? { ok: true };
}

export function PaperclipOfficeHero({
  paperclipBaseUrl,
  office,
  fallbackClaws,
  automationOpportunities,
  onAssignOpportunity,
  onPauseAgent,
  onResumeAgent,
  onInvokeHeartbeat,
  onWakeAgent,
  onCreateIssue,
  onUpdateIssue,
  onAddIssueComment,
  onCheckoutIssue,
  onReleaseIssue,
  onApproveApproval,
  onRejectApproval,
  onRequestApprovalRevision,
  onResubmitApproval,
  onCreateAgent,
  onHireAgent,
  onUpdateAgent,
}: PaperclipOfficeHeroProps) {
  const [selectedAgent, setSelectedAgent] = useState<PaperclipOfficeAgent | null>(null);
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [approvalNote, setApprovalNote] = useState("");
  const [taskActionNote, setTaskActionNote] = useState("");
  const [taskDraft, setTaskDraft] = useState({
    title: "",
    description: "",
    assigneeAgentId: "",
    priority: "normal",
  });
  const [agentUpdateDraft, setAgentUpdateDraft] = useState({
    title: "",
    role: "engineer",
  });
  const [agentDraft, setAgentDraft] = useState({
    name: "",
    role: "engineer",
    title: "",
    capabilities: "",
    adapterType: "openclaw_gateway",
    reportsTo: "",
  });
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const stations = useMemo<StationLayout[]>(
    () =>
      (office?.agents || []).slice(0, STATION_POSITIONS.length).map((agent, index) => ({
        agent,
        left: STATION_POSITIONS[index]!.left,
        top: STATION_POSITIONS[index]!.top,
      })),
    [office?.agents]
  );

  useEffect(() => {
    if (selectedAgent && office) {
      const next = office.agents.find((agent) => agent.id === selectedAgent.id) || null;
      setSelectedAgent(next);
    }
  }, [office, selectedAgent]);

  useEffect(() => {
    if (!selectedAgent) {
      setAgentUpdateDraft({ title: "", role: "engineer" });
      return;
    }

    setAgentUpdateDraft({
      title: selectedAgent.title,
      role: selectedAgent.role,
    });
  }, [selectedAgent]);

  const activeAgents = office?.agents || [];
  const canUsePaperclip = Boolean(office);
  const activeApprovals = office?.approvals || [];
  const activeTasks = office?.tasks || [];

  const handleDropAssignment = async (opportunityId: string, targetId: string) => {
    setActionError(null);
    if (canUsePaperclip && onCreateIssue) {
      const opportunity = automationOpportunities.find((item) => item.id === opportunityId);
      if (!opportunity) return;
      setPendingAction(`assign:${targetId}`);
      const result = await runAction(() =>
        onCreateIssue({
          title: opportunity.title,
          description: opportunity.summary,
          status: "todo",
          priority: "medium",
          assigneeAgentId: targetId,
        })
      );
      setPendingAction(null);
      if (!result.ok) {
        setActionError(result.error || "Failed to create Paperclip issue.");
        return;
      }

      if (onWakeAgent) {
        const wakeResult = await runAction(() => onWakeAgent(targetId));
        if (!wakeResult.ok) {
          setActionError(wakeResult.error || "Assigned the task, but failed to wake the agent.");
        }
      }
      return;
    }

    await onAssignOpportunity?.(opportunityId, targetId);
  };

  const submitTaskDraft = async () => {
    if (!taskDraft.title.trim() || !onCreateIssue) return;
    setPendingAction("create-issue");
    const result = await runAction(() =>
      onCreateIssue({
        title: taskDraft.title.trim(),
        description: taskDraft.description.trim(),
        status: "todo",
        priority: taskDraft.priority,
        assigneeAgentId: taskDraft.assigneeAgentId || undefined,
      })
    );
    setPendingAction(null);
    if (!result.ok) {
      setActionError(result.error || "Failed to create issue.");
      return;
    }
    setTaskDraft({ title: "", description: "", assigneeAgentId: "", priority: "normal" });
  };

  const submitAgentDraft = async (mode: "create" | "hire") => {
    const runner = mode === "create" ? onCreateAgent : onHireAgent;
    if (!runner || !agentDraft.name.trim() || !agentDraft.title.trim()) return;
    setPendingAction(mode);
    const result = await runAction(() =>
      runner({
        name: agentDraft.name.trim(),
        role: agentDraft.role,
        title: agentDraft.title.trim(),
        capabilities: agentDraft.capabilities.trim(),
        reportsTo: agentDraft.reportsTo || undefined,
        adapterType: agentDraft.adapterType,
        adapterConfig: {
          url: "",
          autoPairOnFirstConnect: true,
        },
      })
    );
    setPendingAction(null);
    if (!result.ok) {
      setActionError(result.error || `Failed to ${mode} agent.`);
      return;
    }
    setAgentDraft({
      name: "",
      role: "engineer",
      title: "",
      capabilities: "",
      adapterType: "openclaw_gateway",
      reportsTo: "",
    });
  };

  const submitAgentUpdate = async () => {
    if (!selectedAgent || !onUpdateAgent) return;
    setPendingAction(`update:${selectedAgent.id}`);
    const result = await runAction(() =>
      onUpdateAgent(selectedAgent.id, {
        title: agentUpdateDraft.title.trim(),
        role: agentUpdateDraft.role,
      })
    );
    setPendingAction(null);
    if (!result.ok) {
      setActionError(result.error || "Failed to update agent.");
    }
  };

  return (
    <>
      <Card className="overflow-hidden border-border/60 bg-background/95">
        <CardHeader className="space-y-4 border-b border-border/60 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <Badge
                variant="outline"
                className="w-fit gap-2 rounded-full border-slate-300/60 bg-white/70 px-3 py-1 text-[11px] uppercase tracking-[0.24em]"
              >
                <Building2 className="h-3.5 w-3.5" />
                Office Control Plane
              </Badge>
              <div>
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  {office ? office.company.name : "Paperclip office"}
                </CardTitle>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                  {office
                    ? "Paperclip coordinates the company; MRnObrainer visualizes the team, active work, and urgent decisions inside the overlay."
                    : "Connect Paperclip in Settings → Connections to replace the local guild mock with a live company office."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setTaskDialogOpen(true)}>
                <Briefcase className="h-4 w-4" />
                Tasks
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setApprovalDialogOpen(true)}>
                <ShieldAlert className="h-4 w-4" />
                Approvals
              </Button>
              <Button type="button" size="sm" className="gap-2" onClick={() => setAdminDialogOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Admin
              </Button>
              <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={() => openPaperclip(paperclipBaseUrl)}>
                <Sparkles className="h-4 w-4" />
                Open Paperclip
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <SummaryPill label="Active agents" value={office ? String(office.company.activeAgents) : String(fallbackClaws.length)} />
            <SummaryPill label="Running now" value={office ? String(office.company.runningAgents) : "0"} />
            <SummaryPill label="Pending approvals" value={office ? String(office.company.pendingApprovals) : "0"} />
            <SummaryPill
              label="Budget"
              value={
                office ? `$${office.company.spendUsd.toFixed(0)} / $${office.company.budgetUsd.toFixed(0)}` : "Local only"
              }
            />
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 p-4 xl:grid-cols-[260px_minmax(0,1fr)_280px]">
          <section className="space-y-3">
            <div className="rounded-3xl border border-border/60 bg-muted/15 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Task board</p>
                  <p className="mt-1 font-medium text-foreground">Urgent work</p>
                </div>
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  {activeTasks.length} open
                </Badge>
              </div>
              <div className="mt-3 space-y-2">
                {(activeTasks.length > 0 ? activeTasks.slice(0, 4) : []).map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => setTaskDialogOpen(true)}
                    className="w-full rounded-2xl border border-border/60 bg-background/80 p-3 text-left transition hover:bg-background"
                  >
                    <p className="text-sm font-medium text-foreground">{task.identifier}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{shortTaskLabel(task.title)}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                      <span>{task.status}</span>
                      {task.assigneeName ? <span>{task.assigneeName}</span> : null}
                    </div>
                  </button>
                ))}
                {activeTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No Paperclip tasks are visible yet. Create one from the admin controls or drag an automation into a station.
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-border/60 bg-[#f3efe7] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <div className="relative h-[420px] overflow-hidden rounded-[1.75rem] border border-black/5 bg-[linear-gradient(180deg,#faf6ef_0%,#efe3d2_100%)]">
              <svg viewBox="0 0 960 640" className="absolute inset-0 h-full w-full" aria-hidden="true">
                <defs>
                  <linearGradient id="officeFloor" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#f7ecd9" />
                    <stop offset="100%" stopColor="#e9d5b5" />
                  </linearGradient>
                  <linearGradient id="glassGlow" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="960" height="640" rx="42" fill="url(#officeFloor)" />
                <path d="M100 112h760v380H100z" fill="#fff8ee" opacity="0.45" />
                <path d="M135 146h690v312H135z" fill="none" stroke="#d9c4a2" strokeWidth="12" strokeDasharray="18 16" />
                <path d="M300 92h360v74H300z" fill="#d7e8ef" opacity="0.8" />
                <path d="M96 476h768v112H96z" fill="#dcbf97" opacity="0.75" />
                <ellipse cx="480" cy="538" rx="270" ry="62" fill="#cbb088" opacity="0.5" />
                <rect x="386" y="282" width="188" height="102" rx="24" fill="#1f2937" opacity="0.08" />
                <rect x="408" y="302" width="144" height="68" rx="18" fill="url(#glassGlow)" />
              </svg>

              {stations.map(({ agent, left, top }) => {
                const tone = STATUS_TONE[agent.status];
                return (
                  <button
                    key={agent.id}
                    type="button"
                    style={{ left, top }}
                    onClick={() => {
                      setSelectedAgent(agent);
                      setAgentDialogOpen(true);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const opportunityId = event.dataTransfer.getData("text/opportunity-id");
                      if (opportunityId) {
                        void handleDropAssignment(opportunityId, agent.id);
                      }
                    }}
                    className="absolute w-[180px] -translate-x-1/2 -translate-y-1/2 text-left"
                  >
                    <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-3 shadow-[0_18px_34px_rgba(90,64,31,0.14)] backdrop-blur">
                      <div className={`rounded-[1.1rem] bg-gradient-to-br ${tone.floor} p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{agent.name}</p>
                            <p className="text-[11px] uppercase tracking-[0.15em] text-slate-600">{agent.title}</p>
                          </div>
                          <Badge className={`rounded-full border px-2 py-0.5 text-[10px] ${tone.badge}`}>
                            {tone.label}
                          </Badge>
                        </div>
                        <div className="mt-3 rounded-2xl bg-white/75 px-3 py-2 text-xs text-slate-700">
                          {shortTaskLabel(agent.currentTask)}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600">
                          <span>{agent.locationLabel}</span>
                          <span>{agent.lastHeartbeatLabel}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {!office ? (
                <div className="absolute inset-x-8 bottom-6 rounded-[1.5rem] border border-dashed border-slate-400/50 bg-white/70 p-4 text-sm text-slate-700 shadow-sm">
                  <p className="font-medium">Paperclip is not connected yet.</p>
                  <p className="mt-1 text-slate-600">
                    Connect one active Paperclip company in Settings → Connections to replace the local claw mock with a live office.
                  </p>
                </div>
              ) : null}

              {pendingAction ? (
                <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs text-white shadow-lg">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Syncing office
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-3">
            <div className="rounded-3xl border border-border/60 bg-muted/15 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Approval room</p>
                  <p className="mt-1 font-medium text-foreground">Needs board action</p>
                </div>
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  {activeApprovals.length} pending
                </Badge>
              </div>

              <div className="mt-3 space-y-2">
                {activeApprovals.slice(0, 4).map((approval) => (
                  <button
                    key={approval.id}
                    type="button"
                    onClick={() => setApprovalDialogOpen(true)}
                    className="w-full rounded-2xl border border-border/60 bg-background/80 p-3 text-left transition hover:bg-background"
                  >
                    <p className="text-sm font-medium text-foreground">{approval.type.replace(/_/g, " ")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {approval.requestedByAgentName || "Paperclip board request"}
                    </p>
                    <div className="mt-2 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                      {approval.status}
                    </div>
                  </button>
                ))}
                {activeApprovals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending approvals right now.</p>
                ) : null}
              </div>
            </div>

            {actionError ? (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
                {actionError}
              </div>
            ) : null}
          </section>
        </CardContent>
      </Card>

      <Dialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAgent ? selectedAgent.name : "Agent details"}</DialogTitle>
            <DialogDescription>
              Review runtime state and perform Paperclip actions without leaving MRnObrainer.
            </DialogDescription>
          </DialogHeader>

          {selectedAgent ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <SummaryPill label="Role" value={selectedAgent.role} />
                <SummaryPill label="Status" value={STATUS_TONE[selectedAgent.status].label} />
                <SummaryPill
                  label="Budget"
                  value={`$${Math.round(selectedAgent.spentMonthlyCents / 100)} / $${Math.round(
                    selectedAgent.budgetMonthlyCents / 100
                  )}`}
                />
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/15 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Current task</p>
                <p className="mt-1">{selectedAgent.currentTask}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.15em]">{selectedAgent.lastHeartbeatLabel}</p>
              </div>

              <div className="grid gap-3 rounded-2xl border border-border/60 bg-background/80 p-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Agent profile</p>
                  <Input
                    value={agentUpdateDraft.title}
                    onChange={(event) =>
                      setAgentUpdateDraft((prev) => ({
                        ...prev,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Agent title"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Role</p>
                  <Select
                    value={agentUpdateDraft.role}
                    onValueChange={(value) =>
                      setAgentUpdateDraft((prev) => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ceo">CEO</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="engineer">Engineer</SelectItem>
                      <SelectItem value="researcher">Researcher</SelectItem>
                      <SelectItem value="operator">Operator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={async () => {
                    setPendingAction(`pause:${selectedAgent.id}`);
                    const result =
                      selectedAgent.status === "paused"
                        ? await runAction(
                            onResumeAgent
                              ? () => onResumeAgent(selectedAgent.id)
                              : undefined
                          )
                        : await runAction(
                            onPauseAgent
                              ? () => onPauseAgent(selectedAgent.id)
                              : undefined
                          );
                    setPendingAction(null);
                    if (!result.ok) setActionError(result.error || "Failed to change agent state.");
                  }}
                >
                  {selectedAgent.status === "paused" ? (
                    <PlayCircle className="h-4 w-4" />
                  ) : (
                    <PauseCircle className="h-4 w-4" />
                  )}
                  {selectedAgent.status === "paused" ? "Resume" : "Pause"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={async () => {
                    setPendingAction(`heartbeat:${selectedAgent.id}`);
                    const result = await runAction(
                      onInvokeHeartbeat
                        ? () => onInvokeHeartbeat(selectedAgent.id)
                        : undefined
                    );
                    setPendingAction(null);
                    if (!result.ok) setActionError(result.error || "Failed to invoke heartbeat.");
                  }}
                >
                  <BellRing className="h-4 w-4" />
                  Heartbeat
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="gap-2"
                  onClick={async () => {
                    setPendingAction(`wake:${selectedAgent.id}`);
                    const result = await runAction(
                      onWakeAgent
                        ? () => onWakeAgent(selectedAgent.id)
                        : undefined
                    );
                    setPendingAction(null);
                    if (!result.ok) setActionError(result.error || "Failed to wake agent.");
                  }}
                >
                  <Zap className="h-4 w-4" />
                  Wake
                </Button>
                <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={() => openPaperclip(paperclipBaseUrl)}>
                  <Rocket className="h-4 w-4" />
                  Open in Paperclip
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={submitAgentUpdate}
                >
                  Save profile
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Task board</DialogTitle>
            <DialogDescription>Create, assign, and update Paperclip tasks.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
            <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/10 p-4">
              <p className="font-medium text-foreground">Create task</p>
              <Input
                value={taskDraft.title}
                onChange={(event) => setTaskDraft((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Task title"
              />
              <Textarea
                value={taskDraft.description}
                onChange={(event) => setTaskDraft((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Describe the work"
                rows={4}
              />
              <Select
                value={taskDraft.assigneeAgentId || "unassigned"}
                onValueChange={(value) =>
                  setTaskDraft((prev) => ({
                    ...prev,
                    assigneeAgentId: value === "unassigned" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assign agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {activeAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={taskDraft.priority}
                onValueChange={(value) => setTaskDraft((prev) => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" className="w-full gap-2" onClick={submitTaskDraft}>
                <Rocket className="h-4 w-4" />
                Create task
              </Button>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                <p className="text-sm font-medium text-foreground">Task note / release</p>
                <Textarea
                  value={taskActionNote}
                  onChange={(event) => setTaskActionNote(event.target.value)}
                  placeholder="Use this note for comments, status updates, or release context."
                  rows={3}
                />
              </div>

              <ScrollArea className="h-[320px] rounded-2xl border border-border/60 bg-background">
                <div className="space-y-3 p-4">
                {activeTasks.map((task) => (
                  <div key={task.id} className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{task.identifier}</p>
                        <p className="mt-1 text-sm text-foreground">{task.title}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{shortTaskLabel(task.summary)}</p>
                      </div>
                      <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.15em]">
                        {task.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {task.assigneeAgentId ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={async () => {
                            setPendingAction(`checkout:${task.id}`);
                            const result = await runAction(
                              onCheckoutIssue
                                ? () => onCheckoutIssue(task.id, task.assigneeAgentId!)
                                : undefined
                            );
                            setPendingAction(null);
                            if (!result.ok) setActionError(result.error || "Failed to start task.");
                          }}
                        >
                          <PlayCircle className="h-4 w-4" />
                          Start
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={async () => {
                          setPendingAction(`done:${task.id}`);
                          const result = await runAction(
                            onUpdateIssue
                              ? () =>
                                  onUpdateIssue(task.id, {
                                    status: "done",
                                    comment: "Completed from MRnObrainer office.",
                                  })
                              : undefined
                          );
                          setPendingAction(null);
                          if (!result.ok) setActionError(result.error || "Failed to update task.");
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Done
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={async () => {
                          setPendingAction(`block:${task.id}`);
                          const result = await runAction(
                            onUpdateIssue
                              ? () =>
                                  onUpdateIssue(task.id, {
                                    status: "blocked",
                                    comment: "Needs review from the office board.",
                                  })
                              : undefined
                          );
                          setPendingAction(null);
                          if (!result.ok) setActionError(result.error || "Failed to block task.");
                        }}
                      >
                        <CircleOff className="h-4 w-4" />
                        Block
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={async () => {
                          setPendingAction(`comment:${task.id}`);
                          const result = await runAction(
                            onAddIssueComment
                              ? () =>
                                  onAddIssueComment(
                                    task.id,
                                    taskActionNote || "Office update from MRnObrainer."
                                  )
                              : undefined
                          );
                          setPendingAction(null);
                          if (!result.ok) setActionError(result.error || "Failed to add comment.");
                        }}
                      >
                        <BellRing className="h-4 w-4" />
                        Comment
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={async () => {
                          setPendingAction(`release:${task.id}`);
                          const result = await runAction(
                            onReleaseIssue ? () => onReleaseIssue(task.id) : undefined
                          );
                          setPendingAction(null);
                          if (!result.ok) setActionError(result.error || "Failed to release task.");
                        }}
                      >
                        <PlayCircle className="h-4 w-4" />
                        Release
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => openPaperclip(paperclipBaseUrl)}>
                        Open in Paperclip
                      </Button>
                    </div>
                  </div>
                ))}
                {activeTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No Paperclip tasks loaded.</p>
                ) : null}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Approvals</DialogTitle>
            <DialogDescription>Resolve pending Paperclip approvals from the office board.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={approvalNote}
            onChange={(event) => setApprovalNote(event.target.value)}
            placeholder="Decision note to send with the action"
            rows={3}
          />
          <ScrollArea className="h-[380px] rounded-2xl border border-border/60 bg-background">
            <div className="space-y-3 p-4">
              {activeApprovals.map((approval) => (
                <div key={approval.id} className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{approval.type.replace(/_/g, " ")}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {approval.requestedByAgentName || "Board request"}
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.15em]">
                      {approval.status}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        setPendingAction(`approve:${approval.id}`);
                        const result = await runAction(
                          onApproveApproval
                            ? () =>
                                onApproveApproval(
                                  approval.id,
                                  approvalNote || "Approved from MRnObrainer."
                                )
                            : undefined
                        );
                        setPendingAction(null);
                        if (!result.ok) setActionError(result.error || "Failed to approve request.");
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        setPendingAction(`reject:${approval.id}`);
                        const result = await runAction(
                          onRejectApproval
                            ? () =>
                                onRejectApproval(
                                  approval.id,
                                  approvalNote || "Rejected from MRnObrainer."
                                )
                            : undefined
                        );
                        setPendingAction(null);
                        if (!result.ok) setActionError(result.error || "Failed to reject request.");
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        setPendingAction(`revise:${approval.id}`);
                        const result = await runAction(
                          onRequestApprovalRevision
                            ? () =>
                                onRequestApprovalRevision(
                                  approval.id,
                                  approvalNote || "Please revise and resubmit."
                                )
                            : undefined
                        );
                        setPendingAction(null);
                        if (!result.ok) {
                          setActionError(result.error || "Failed to request revision.");
                        }
                      }}
                    >
                      Request revision
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        setPendingAction(`resubmit:${approval.id}`);
                        const result = await runAction(
                          onResubmitApproval
                            ? () =>
                                onResubmitApproval(approval.id, {
                                  note: approvalNote || "Resubmitted from MRnObrainer.",
                                })
                            : undefined
                        );
                        setPendingAction(null);
                        if (!result.ok) setActionError(result.error || "Failed to resubmit approval.");
                      }}
                    >
                      Resubmit
                    </Button>
                  </div>
                </div>
              ))}
              {activeApprovals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No approvals are pending.</p>
              ) : null}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Admin controls</DialogTitle>
            <DialogDescription>Hire or create new Paperclip agents without leaving the overlay.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={agentDraft.name}
              onChange={(event) => setAgentDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Agent name"
            />
            <Input
              value={agentDraft.title}
              onChange={(event) => setAgentDraft((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Agent title"
            />
            <Select
              value={agentDraft.role}
              onValueChange={(value) => setAgentDraft((prev) => ({ ...prev, role: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ceo">CEO</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="engineer">Engineer</SelectItem>
                <SelectItem value="researcher">Researcher</SelectItem>
                <SelectItem value="operator">Operator</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={agentDraft.reportsTo || "none"}
              onValueChange={(value) =>
                setAgentDraft((prev) => ({ ...prev, reportsTo: value === "none" ? "" : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Reports to" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No manager</SelectItem>
                {activeAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="md:col-span-2">
              <Textarea
                value={agentDraft.capabilities}
                onChange={(event) => setAgentDraft((prev) => ({ ...prev, capabilities: event.target.value }))}
                placeholder="Capabilities"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="button" variant="outline" onClick={() => void submitAgentDraft("hire")}>
              Hire request
            </Button>
            <Button type="button" onClick={() => void submitAgentDraft("create")}>
              Create directly
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/10 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
