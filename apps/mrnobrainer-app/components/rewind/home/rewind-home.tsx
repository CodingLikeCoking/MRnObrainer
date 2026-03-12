"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { join } from "@tauri-apps/api/path";
import { PhysicalPosition } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import localforage from "localforage";
import { Loader2 } from "lucide-react";

import type { Message as InboxMessage } from "@/components/inbox-messages";
import { RewindHomeScreen } from "@/components/rewind/home/rewind-home-screen";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { showChatWithPrefill } from "@/lib/chat-utils";
import { usePaperclipOffice } from "@/lib/hooks/use-paperclip-office";
import { usePipes } from "@/lib/hooks/use-pipes";
import { useSettings } from "@/lib/hooks/use-settings";
import { LOCAL_API_BASE_URL } from "@/lib/product-config";
import {
  buildRewindHomeViewModel,
  createWorkflowPlan,
  getDefaultRewindSettings,
  type RewindAutomationOpportunity,
  type RewindSettingsState,
} from "@/lib/rewind/home-model";
import {
  createAutomationDraftBundle,
  deriveAutomationOpportunities,
  installAutomationDraftBundle,
} from "@/lib/rewind/automation-runtime";
import {
  buildWorkflowPrompt,
  createAssistantContext,
  deriveBranchGraphSnapshot,
  deriveActivitySnapshot,
  getRewindOutputDir,
  loadLatestRewindArtifacts,
  type CapturedSearchItem,
} from "@/lib/rewind/home-runtime";

const SCREENPIPE_API = LOCAL_API_BASE_URL;
const INBOX_UPDATED_EVENT = "screenpipe:inbox-updated";

async function fetchTodayActivity(): Promise<CapturedSearchItem[]> {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const params = {
    start_time: dayStart.toISOString(),
    end_time: now.toISOString(),
    limit: "500",
  };

  const [allResponse, inputResponse] = await Promise.all([
    fetch(`${SCREENPIPE_API}/search?${new URLSearchParams({ ...params, content_type: "all" })}`),
    fetch(`${SCREENPIPE_API}/search?${new URLSearchParams({ ...params, content_type: "input" })}`),
  ]);

  const allJson = allResponse.ok ? await allResponse.json() : { data: [] };
  const inputJson = inputResponse.ok ? await inputResponse.json() : { data: [] };

  return [...(allJson.data || []), ...(inputJson.data || [])] as CapturedSearchItem[];
}

function estimateXp(focusMinutes: number, topAppCount: number): number {
  return Math.min(100, Math.round(focusMinutes * 0.35 + topAppCount * 4));
}

function formatPipeTimestamp(value?: string | null) {
  if (!value) return "Not run yet";

  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return "Recently";
  }
}

export function RewindHome({
  showTimelinePreview = true,
  activeSection = "home",
}: {
  showTimelinePreview?: boolean;
  activeSection?: "home" | "timeline";
}) {
  const { settings, updateSettings } = useSettings();
  const { pipes, refetch: refetchPipes } = usePipes({ includeExecutions: true });
  const { toast } = useToast();
  const rewindSettings = useMemo<RewindSettingsState>(
    () => ({ ...getDefaultRewindSettings(), ...(settings.rewind || {}) }),
    [settings.rewind]
  );
  const paperclipOffice = usePaperclipOffice({
    settings: rewindSettings.paperclip,
    active: activeSection === "home",
  });
  const [goalDraft, setGoalDraft] = useState(rewindSettings.goal);
  const [askAiDraft, setAskAiDraft] = useState("What did I finish today?");

  const [capturedItems, setCapturedItems] = useState<CapturedSearchItem[]>([]);
  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>([]);
  const [activity, setActivity] = useState({ topApps: [], focusMinutes: 0 } as ReturnType<typeof deriveActivitySnapshot>);
  const [artifacts, setArtifacts] = useState<Awaited<ReturnType<typeof loadLatestRewindArtifacts>>>({
    state: { level: 1, streakDays: 0, cumulativeXp: 0, lastFinalizedDate: null as string | null },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCallingItADay, setIsCallingItADay] = useState(false);
  const [isDraftingOpportunity, setIsDraftingOpportunity] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<RewindAutomationOpportunity | null>(null);
  const isApplyingSavedPosition = useRef(false);
  const savePositionTimeout = useRef<number | null>(null);

  const activePipe = pipes.find((pipe) => pipe.config.name === rewindSettings.dailyReviewPipeName);
  const latestExecution = activePipe?.recent_executions?.[0];
  const dailyReviewLastRunLabel = formatPipeTimestamp(
    latestExecution?.finished_at || activePipe?.last_run || null
  );
  const dailyReviewLastRunStatusLabel = !activePipe
    ? "Install required"
    : activePipe.is_running
      ? "Currently running"
      : activePipe.last_success === false
        ? "Last run failed"
        : activePipe.last_success === true
          ? "Last run succeeded"
          : "No result yet";
  const dailyReviewQueueLabel = !activePipe
    ? "Install the workflow"
    : activePipe.is_running
      ? "Running on this Mac"
      : activePipe.current_execution_id
        ? "Queued locally"
        : "Waiting for you";
  const visibleWidgets = (rewindSettings.visibleWidgets || getDefaultRewindSettings().visibleWidgets)
    .filter((widget) => showTimelinePreview || widget !== "timeline-preview");
  const widgetOrder = useMemo(() => {
    const ordered = rewindSettings.widgetOrder.filter((widget) => visibleWidgets.includes(widget));
    const missing = visibleWidgets.filter((widget) => !ordered.includes(widget));
    return [...ordered, ...missing];
  }, [rewindSettings.widgetOrder, visibleWidgets]);

  const loadHomeData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [capturedActivity, nextArtifacts] = await Promise.all([
        fetchTodayActivity().catch(() => [] as CapturedSearchItem[]),
        loadLatestRewindArtifacts(rewindSettings.dailyReviewPipeName),
      ]);
      setCapturedItems(capturedActivity);
      setActivity(deriveActivitySnapshot(capturedActivity));
      setArtifacts({
        ...nextArtifacts,
        branchGraph:
          nextArtifacts.branchGraph && nextArtifacts.branchGraph.lanes.length > 0
            ? nextArtifacts.branchGraph
            : deriveBranchGraphSnapshot(capturedActivity),
      });
    } finally {
      setIsLoading(false);
    }
  }, [rewindSettings.dailyReviewPipeName]);

  useEffect(() => {
    loadHomeData();
    const interval = window.setInterval(loadHomeData, 60000);
    return () => window.clearInterval(interval);
  }, [loadHomeData]);

  useEffect(() => {
    const loadInbox = async () => {
      const savedMessages =
        (await localforage.getItem<InboxMessage[]>("inboxMessages")) || [];
      setInboxMessages(savedMessages);
    };

    loadInbox();

    const handleInboxUpdated = () => {
      void loadInbox();
    };

    window.addEventListener(INBOX_UPDATED_EVENT, handleInboxUpdated);

    return () => {
      window.removeEventListener(INBOX_UPDATED_EVENT, handleInboxUpdated);
    };
  }, []);

  const updateInboxMessages = useCallback(
    async (updater: (messages: InboxMessage[]) => InboxMessage[]) => {
      const nextMessages = updater(inboxMessages);
      setInboxMessages(nextMessages);
      await localforage.setItem("inboxMessages", nextMessages);
      window.dispatchEvent(new CustomEvent(INBOX_UPDATED_EVENT));
    },
    [inboxMessages]
  );

  const markInboxMessageRead = useCallback(
    async (messageId: string) => {
      await updateInboxMessages((messages) =>
        messages.map((message) =>
          message.id === messageId ? { ...message, read: true } : message
        )
      );
    },
    [updateInboxMessages]
  );

  const deleteInboxMessage = useCallback(
    async (messageId: string) => {
      await updateInboxMessages((messages) =>
        messages.filter((message) => message.id !== messageId)
      );
    },
    [updateInboxMessages]
  );

  useEffect(() => {
    setGoalDraft(rewindSettings.goal);
  }, [rewindSettings.goal]);

  useEffect(() => {
    if (savePositionTimeout.current) {
      window.clearTimeout(savePositionTimeout.current);
      savePositionTimeout.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const appWindow = getCurrentWindow();

    const applySavedPosition = async () => {
      if (!rewindSettings.dashboardPosition) return;
      isApplyingSavedPosition.current = true;
      try {
        await appWindow.setPosition(
          new PhysicalPosition(
            rewindSettings.dashboardPosition.x,
            rewindSettings.dashboardPosition.y
          )
        );
      } catch {
        // window positioning is best-effort in the compatibility-first fork
      } finally {
        window.setTimeout(() => {
          if (!cancelled) {
            isApplyingSavedPosition.current = false;
          }
        }, 120);
      }
    };

    applySavedPosition();

    let unlisten: (() => void) | undefined;
    appWindow
      .onMoved(async ({ payload }) => {
        if (isApplyingSavedPosition.current) return;

        if (rewindSettings.dashboardLocationLocked && rewindSettings.dashboardPosition) {
          isApplyingSavedPosition.current = true;
          try {
            await appWindow.setPosition(
              new PhysicalPosition(
                rewindSettings.dashboardPosition.x,
                rewindSettings.dashboardPosition.y
              )
            );
          } catch {
            // ignore positioning failures
          } finally {
            window.setTimeout(() => {
              if (!cancelled) {
                isApplyingSavedPosition.current = false;
              }
            }, 120);
          }
          return;
        }

        if (savePositionTimeout.current) {
          window.clearTimeout(savePositionTimeout.current);
        }

        savePositionTimeout.current = window.setTimeout(() => {
          updateSettings({
            rewind: {
              ...rewindSettings,
              dashboardPosition: {
                x: payload.x,
                y: payload.y,
              },
            },
          });
        }, 200);
      })
      .then((fn) => {
        unlisten = fn;
      });

    return () => {
      cancelled = true;
      if (savePositionTimeout.current) {
        window.clearTimeout(savePositionTimeout.current);
        savePositionTimeout.current = null;
      }
      unlisten?.();
    };
  }, [
    rewindSettings,
    rewindSettings.dashboardLocationLocked,
    rewindSettings.dashboardPosition,
    updateSettings,
  ]);

  const xpEarned = estimateXp(activity.focusMinutes, activity.topApps.length);
  const automationOpportunities = useMemo(
    () =>
      deriveAutomationOpportunities({
        goal: goalDraft,
        items: capturedItems,
        review: artifacts.review,
        branchGraph: artifacts.branchGraph,
      }),
    [artifacts.branchGraph, artifacts.review, capturedItems, goalDraft]
  );
  const viewModel = useMemo(
    () =>
      buildRewindHomeViewModel({
        goal: goalDraft,
        topApps: activity.topApps,
        focusMinutes: activity.focusMinutes,
        xpEarned,
        level: artifacts.state.level,
        streakDays: artifacts.state.streakDays,
        review: artifacts.review,
        pipeInstalled: Boolean(activePipe),
        pipeRunning: activePipe?.is_running,
        pipeLastRunLabel: dailyReviewLastRunLabel,
        pipeLastRunStatusLabel: dailyReviewLastRunStatusLabel,
        pipeQueueLabel: dailyReviewQueueLabel,
        pipeRuntimeTargetLabel: "This Mac · Local pipe",
        pipeLastError: activePipe?.last_error || latestExecution?.error_message || null,
        branchGraph: artifacts.branchGraph,
        automationOpportunities,
        claws: rewindSettings.claws,
        workflowCatalog: rewindSettings.workflowCatalog,
        workflowAssignments: rewindSettings.workflowAssignments,
        guardrails: rewindSettings.automationGuardrails,
        paperclipOffice: paperclipOffice.snapshot,
      }),
    [
      activePipe,
      activity.focusMinutes,
      activity.topApps,
      automationOpportunities,
      artifacts.branchGraph,
      artifacts.review,
      artifacts.state.level,
      artifacts.state.streakDays,
      dailyReviewLastRunLabel,
      dailyReviewLastRunStatusLabel,
      dailyReviewQueueLabel,
      goalDraft,
      rewindSettings.automationGuardrails,
      rewindSettings.claws,
      paperclipOffice.snapshot,
      rewindSettings.workflowAssignments,
      rewindSettings.workflowCatalog,
      xpEarned,
    ]
  );

  const updateGoal = useCallback(
    async (goal: string) => {
      setGoalDraft(goal);
      await updateSettings({
        rewind: {
          ...rewindSettings,
          goal,
        },
      });
    },
    [rewindSettings, updateSettings]
  );

  const openAssistant = useCallback(async () => {
    await showChatWithPrefill({
      context: createAssistantContext(viewModel),
      prompt: "Help me refine today’s goal and break it into concrete next actions.",
      source: "rewind-home",
    });
  }, [viewModel]);

  const openReviewOutput = useCallback(async () => {
    if (!artifacts.review?.dateKey) return;
    const outputDir = await getRewindOutputDir(rewindSettings.dailyReviewPipeName);
    const reviewDir = await join(outputDir, artifacts.review.dateKey);
    await revealItemInDir(reviewDir);
  }, [artifacts.review?.dateKey, rewindSettings.dailyReviewPipeName]);

  const callItADay = useCallback(async () => {
    if (!activePipe) {
      toast({
        title: "daily review not installed",
        description: "Install the daily-review pipe first.",
        variant: "destructive",
      });
      return;
    }

    setIsCallingItADay(true);
    try {
      const response = await fetch(`${SCREENPIPE_API}/pipes/${activePipe.config.name}/run`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`run request failed with ${response.status}`);
      }
      toast({
        title: "calling it a day",
        description: "The MRnObrainer daily review is running in the background.",
      });
      await refetchPipes();
      window.setTimeout(() => {
        loadHomeData();
        refetchPipes();
      }, 2500);
    } catch (error) {
      toast({
        title: "failed to run daily review",
        description: error instanceof Error ? error.message : "unknown error",
        variant: "destructive",
      });
    } finally {
      setIsCallingItADay(false);
    }
  }, [activePipe, loadHomeData, refetchPipes, toast]);

  const planOpportunity = useCallback(
    (opportunity: RewindAutomationOpportunity) => {
      setSelectedOpportunity(opportunity);
    },
    []
  );

  const askAi = useCallback(async () => {
    const prompt = askAiDraft.trim();
    if (!prompt) return;
    await showChatWithPrefill({
      context: createAssistantContext(viewModel),
      prompt,
      source: "mrnobrainer-dashboard",
    });
    toast({
      title: "assistant opened",
      description: "Your question was sent to the MRnObrainer assistant.",
    });
  }, [askAiDraft, toast, viewModel]);

  const assignOpportunity = useCallback(
    async (opportunityId: string, clawId: string) => {
      const opportunity = automationOpportunities.find((item) => item.id === opportunityId);
      if (!opportunity) return;

      if (paperclipOffice.configured) {
        const createResult = await paperclipOffice.createIssue({
          title: opportunity.title,
          description: opportunity.evidenceSummary
            ? `${opportunity.summary}\n\n${opportunity.evidenceSummary}`
            : opportunity.summary,
          status: "todo",
          priority: "medium",
          assigneeAgentId: clawId,
        });

        if (!createResult.ok) {
          toast({
            title: "paperclip assignment failed",
            description: createResult.error || "Could not create Paperclip issue.",
            variant: "destructive",
          });
          return;
        }

        await paperclipOffice.wakeupAgent(clawId, {
          source: "assignment",
          triggerDetail: "manual",
          reason: `Assigned from MRnObrainer office: ${opportunity.title}`,
        });

        toast({
          title: "paperclip quest assigned",
          description: `Paperclip queued "${opportunity.title}" for the selected station.`,
        });
        return;
      }

      const claw = rewindSettings.claws.find((item) => item.id === clawId);
      if (!claw) return;

      const recommended = opportunity.recommendedExecutors || [];
      const executorId =
        claw.executorPreference.find((candidate) => recommended.includes(candidate)) ||
        claw.executorPreference[0] ||
        "local-pipe";

      const existing = rewindSettings.workflowAssignments.filter(
        (assignment) => assignment.clawId !== clawId
      );

      await updateSettings({
        rewind: {
          ...rewindSettings,
          workflowAssignments: [
            ...existing,
            {
              id: `assignment-${clawId}-${opportunityId}`,
              opportunityId,
              clawId,
              executorId,
              status: "queued",
              approvalMode:
                rewindSettings.askBeforePrivilegedActions || !rewindSettings.trustedAutopilot
                  ? "ask"
                  : "trusted",
              modelPolicy: rewindSettings.automationGuardrails.preferLocalModels
                ? "local-first"
                : "oauth-allowed",
              summary: opportunity.title,
            },
          ],
        },
      });

      toast({
        title: "quest assigned",
        description: `${claw.name} is queued for "${opportunity.title}".`,
      });
    },
    [
      automationOpportunities,
      paperclipOffice,
      rewindSettings,
      toast,
      updateSettings,
    ]
  );

  const toggleLocationLock = useCallback(async () => {
    const nextLocked = !rewindSettings.dashboardLocationLocked;
    let dashboardPosition = rewindSettings.dashboardPosition;

    if (nextLocked && !dashboardPosition) {
      try {
        const position = await getCurrentWindow().outerPosition();
        dashboardPosition = { x: position.x, y: position.y };
      } catch {
        dashboardPosition = null;
      }
    }

    await updateSettings({
      rewind: {
        ...rewindSettings,
        dashboardLocationLocked: nextLocked,
        dashboardPosition,
      },
    });

    toast({
      title: nextLocked ? "dashboard location locked" : "dashboard location unlocked",
      description: nextLocked
        ? "MRnObrainer will reopen in the same spot."
        : "You can move the MRnObrainer dashboard again.",
    });
  }, [rewindSettings, toast, updateSettings]);

  const executePlannedWorkflow = useCallback(async () => {
    if (!selectedOpportunity) return;
    const workflowPlan = createWorkflowPlan({
      title: selectedOpportunity.title,
      summary: selectedOpportunity.evidenceSummary
        ? `${selectedOpportunity.summary} ${selectedOpportunity.evidenceSummary}`
        : selectedOpportunity.summary,
      lane: selectedOpportunity.lane,
      goal: goalDraft,
      allowedPaths: rewindSettings.allowedPaths,
      askBeforePrivilegedActions: rewindSettings.askBeforePrivilegedActions,
      steps: selectedOpportunity.walkthrough?.map((step) => step.title),
    });

    await showChatWithPrefill({
      context: createAssistantContext(viewModel),
      prompt: buildWorkflowPrompt(workflowPlan),
      autoSend: true,
      source: "rewind-automation",
    });

    toast({
      title: "automation workflow opened",
      description: "The workflow plan was sent to the assistant window.",
    });
    setSelectedOpportunity(null);
  }, [
    goalDraft,
    rewindSettings.allowedPaths,
    rewindSettings.askBeforePrivilegedActions,
    selectedOpportunity,
    toast,
    viewModel,
  ]);

  const draftOpportunity = useCallback(async () => {
    if (!selectedOpportunity) return;

    setIsDraftingOpportunity(true);
    try {
      const bundle = createAutomationDraftBundle({
        opportunity: selectedOpportunity,
        goal: goalDraft,
        allowedPaths: rewindSettings.allowedPaths,
        askBeforePrivilegedActions: rewindSettings.askBeforePrivilegedActions,
        trustedAutopilot: rewindSettings.trustedAutopilot,
      });
      const installResult = await installAutomationDraftBundle(bundle, SCREENPIPE_API);
      await refetchPipes();
      toast({
        title: "automation drafted",
        description: `Installed "${installResult.pipeName}" as a disabled automation. Review it in Automations before enabling.`,
      });
      setSelectedOpportunity(null);
    } catch (error) {
      toast({
        title: "failed to draft automation",
        description: error instanceof Error ? error.message : "unknown error",
        variant: "destructive",
      });
    } finally {
      setIsDraftingOpportunity(false);
    }
  }, [
    goalDraft,
    refetchPipes,
    rewindSettings.allowedPaths,
    rewindSettings.askBeforePrivilegedActions,
    rewindSettings.trustedAutopilot,
    selectedOpportunity,
    toast,
  ]);

  const selectedPlan = useMemo(
    () =>
      selectedOpportunity
        ? createWorkflowPlan({
            title: selectedOpportunity.title,
            summary: selectedOpportunity.evidenceSummary
              ? `${selectedOpportunity.summary} ${selectedOpportunity.evidenceSummary}`
              : selectedOpportunity.summary,
            lane: selectedOpportunity.lane,
            goal: goalDraft,
            allowedPaths: rewindSettings.allowedPaths,
            askBeforePrivilegedActions: rewindSettings.askBeforePrivilegedActions,
            steps: selectedOpportunity.walkthrough?.map((step) => step.title),
          })
        : null,
    [
      goalDraft,
      rewindSettings.allowedPaths,
      rewindSettings.askBeforePrivilegedActions,
      selectedOpportunity,
    ]
  );

  const selectedDraftBundle = useMemo(
    () =>
      selectedOpportunity
        ? createAutomationDraftBundle({
            opportunity: selectedOpportunity,
            goal: goalDraft,
            allowedPaths: rewindSettings.allowedPaths,
            askBeforePrivilegedActions: rewindSettings.askBeforePrivilegedActions,
            trustedAutopilot: rewindSettings.trustedAutopilot,
          })
        : null,
    [
      goalDraft,
      rewindSettings.allowedPaths,
      rewindSettings.askBeforePrivilegedActions,
      rewindSettings.trustedAutopilot,
      selectedOpportunity,
    ]
  );

  return (
    <>
      {isLoading ? (
        <div className="flex h-full items-center justify-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading MRnObrainer Dashboard...
        </div>
      ) : (
        <div className="min-h-0">
          <RewindHomeScreen
            viewModel={viewModel}
            inboxMessages={inboxMessages}
            onMarkInboxMessageRead={markInboxMessageRead}
            onDeleteInboxMessage={deleteInboxMessage}
            isCallingItADay={isCallingItADay}
            askAiDraft={askAiDraft}
            onGoalChange={updateGoal}
            onCallItADay={callItADay}
            onOpenAssistant={openAssistant}
            onPlanOpportunity={planOpportunity}
            onAssignOpportunity={assignOpportunity}
            onAskAiDraftChange={setAskAiDraft}
            onAskAiSubmit={askAi}
            locationLocked={rewindSettings.dashboardLocationLocked}
            onToggleLocationLock={toggleLocationLock}
            widgetOrder={widgetOrder}
            paperclipBaseUrl={rewindSettings.paperclip.baseUrl}
            onPausePaperclipAgent={paperclipOffice.pauseAgent}
            onResumePaperclipAgent={paperclipOffice.resumeAgent}
            onInvokePaperclipHeartbeat={paperclipOffice.invokeHeartbeat}
            onWakePaperclipAgent={(agentId) =>
              paperclipOffice.wakeupAgent(agentId, {
                source: "on_demand",
                triggerDetail: "manual",
                reason: "Manual wake from MRnObrainer office.",
              })
            }
        onCreatePaperclipIssue={paperclipOffice.createIssue}
        onUpdatePaperclipIssue={paperclipOffice.updateIssue}
        onAddPaperclipIssueComment={paperclipOffice.addIssueComment}
        onCheckoutPaperclipIssue={paperclipOffice.checkoutIssue}
        onReleasePaperclipIssue={paperclipOffice.releaseIssue}
        onApprovePaperclipApproval={paperclipOffice.approveApproval}
        onRejectPaperclipApproval={paperclipOffice.rejectApproval}
        onRequestPaperclipApprovalRevision={paperclipOffice.requestApprovalRevision}
        onResubmitPaperclipApproval={paperclipOffice.resubmitApproval}
        onCreatePaperclipAgent={paperclipOffice.createAgent}
        onHirePaperclipAgent={paperclipOffice.hireAgent}
        onUpdatePaperclipAgent={paperclipOffice.updateAgent}
      />

          {artifacts.review && (
            <div className="pointer-events-none fixed bottom-6 right-8 z-30 flex justify-end">
              <Button
                type="button"
                variant="secondary"
                className="pointer-events-auto"
                onClick={openReviewOutput}
              >
                Open latest review output
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={Boolean(selectedOpportunity)} onOpenChange={(open) => !open && setSelectedOpportunity(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedOpportunity?.title || "workflow plan"}</DialogTitle>
            <DialogDescription>
              Review the evidence, then draft a disabled automation or send the plan to the assistant.
            </DialogDescription>
          </DialogHeader>

          {selectedOpportunity && selectedPlan && selectedDraftBundle && (
            <div className="space-y-4 text-sm">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="font-medium text-foreground">{selectedOpportunity.summary}</p>
                {selectedOpportunity.evidenceSummary && (
                  <p className="mt-2 text-muted-foreground">{selectedOpportunity.evidenceSummary}</p>
                )}
                <p className="mt-2 text-muted-foreground">Goal: {selectedPlan.goal || "No explicit goal set."}</p>
                <p className="text-muted-foreground">Scope: {selectedPlan.scopeLabel}</p>
                {selectedOpportunity.recommendedSchedule && (
                  <p className="text-muted-foreground">
                    Suggested schedule: {selectedOpportunity.recommendedSchedule}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Draft bundle
                </p>
                <p className="mt-2 font-medium text-foreground">{selectedDraftBundle.pipeName}</p>
                <p className="mt-1 text-muted-foreground">
                  Approval mode: {rewindSettings.askBeforePrivilegedActions || !rewindSettings.trustedAutopilot
                    ? "Ask before privileged actions"
                    : "Trusted autopilot inside approved scope"}
                </p>
                <ul className="mt-3 space-y-1 text-muted-foreground">
                  <li>`pipe.md` keeps the new automation disabled until you enable it</li>
                  <li>`automation.json` stores the evidence, walkthrough, and safety rules</li>
                </ul>
              </div>

              {selectedOpportunity.walkthrough?.length ? (
                <div className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Walkthrough
                  </p>
                  <ol className="space-y-3">
                    {selectedOpportunity.walkthrough.map((step) => (
                      <li key={step.id} className="rounded-xl border border-border/50 bg-muted/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-foreground">{step.title}</p>
                          <span className="text-xs text-muted-foreground">{step.timestampLabel}</span>
                        </div>
                        <p className="mt-1 text-muted-foreground">{step.detail}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              <ol className="space-y-2 pl-5 text-muted-foreground">
                {selectedPlan.steps.map((step) => (
                  <li key={step} className="list-decimal">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedOpportunity(null)}>
              Cancel
            </Button>
            <Button type="button" variant="outline" onClick={executePlannedWorkflow}>
              Send to assistant
            </Button>
            <Button type="button" onClick={draftOpportunity} disabled={isDraftingOpportunity}>
              {isDraftingOpportunity ? "Drafting..." : "Draft automation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
