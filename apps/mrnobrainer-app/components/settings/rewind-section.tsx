"use client";

import React, { useEffect, useMemo, useState } from "react";
import { homeDir, join } from "@tauri-apps/api/path";
import { exists, readTextFile } from "@tauri-apps/plugin-fs";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  LayoutGrid,
  Loader2,
  LogIn,
  LogOut,
  ShieldCheck,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useSettings } from "@/lib/hooks/use-settings";
import { commands } from "@/lib/utils/tauri";
import { ClawFleetCard } from "@/components/settings/claw-fleet-card";
import {
  getDefaultDashboardWidgets,
  getDefaultRewindSettings,
  type RewindDashboardWidget,
  type RewindSettingsState,
} from "@/lib/rewind/home-model";
import {
  getPipeEnvStatusFromText,
  type PipeEnvStatus,
} from "@/lib/rewind/pipe-env";
import { hasTauriRuntime } from "@/lib/runtime-environment";

const DASHBOARD_WIDGET_LABELS: Record<RewindDashboardWidget, { title: string; description: string }> = {
  goal: {
    title: "Today's goal",
    description: "Lead card for the day, goal editing, and summary chips.",
  },
  "paperclip-office": {
    title: "Office control plane",
    description: "Paperclip-backed office hero, agent stations, tasks, approvals, and admin drawers.",
  },
  "capture-health": {
    title: "Capture health",
    description: "Live screen target, verification state, and last captured frame.",
  },
  "ask-ai": {
    title: "Ask AI",
    description: "Quick recall and assistant entry point from the dashboard.",
  },
  automations: {
    title: "Suggested automations",
    description: "Evidence-backed cards with walkthrough and draft actions.",
  },
  "daily-review": {
    title: "Call it a day",
    description: "Daily review trigger, latest recap, and review status.",
  },
  stats: {
    title: "Momentum",
    description: "Focus minutes, XP, level, and streak.",
  },
  "branch-graph": {
    title: "Cross-device graph",
    description: "Compact device lanes that feed the end-of-day merge.",
  },
  "timeline-preview": {
    title: "Timeline preview",
    description: "Embedded passive timeline below the dashboard widgets.",
  },
};

export function RewindSection() {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const rewindSettings = useMemo<RewindSettingsState>(
    () => ({ ...getDefaultRewindSettings(), ...(settings.rewind || {}) }),
    [settings.rewind]
  );
  const [chatGptConnected, setChatGptConnected] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [pipeInstalled, setPipeInstalled] = useState(false);
  const [showManualOverrides, setShowManualOverrides] = useState(false);
  const [pipeEnvStatus, setPipeEnvStatus] = useState<PipeEnvStatus>({
    configured: false,
    missingKeys: ["NOTION_API_KEY", "NOTION_DATABASE_ID"],
    invalidValues: [],
    fixMode: "guided",
  });

  const persist = async (updates: Partial<typeof rewindSettings>) => {
    await updateSettings({
      rewind: {
        ...rewindSettings,
        ...updates,
      },
    });
  };

  const persistDelivery = async (updates: {
    dashboard?: Partial<RewindSettingsState["delivery"]["dashboard"]>;
    telegram?: Partial<RewindSettingsState["delivery"]["telegram"]>;
  }) => {
    await persist({
      delivery: {
        ...rewindSettings.delivery,
        dashboard: {
          ...rewindSettings.delivery.dashboard,
          ...(updates.dashboard || {}),
        },
        telegram: {
          ...rewindSettings.delivery.telegram,
          ...(updates.telegram || {}),
        },
      },
    });
  };

  const moveWidget = async (widget: RewindDashboardWidget, direction: -1 | 1) => {
    const nextOrder = [...rewindSettings.widgetOrder];
    const index = nextOrder.indexOf(widget);
    const nextIndex = index + direction;
    if (index === -1 || nextIndex < 0 || nextIndex >= nextOrder.length) return;
    [nextOrder[index], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[index]];
    await persist({ widgetOrder: nextOrder });
  };

  const toggleWidget = async (widget: RewindDashboardWidget, checked: boolean) => {
    const visible = checked
      ? Array.from(new Set([...rewindSettings.visibleWidgets, widget]))
      : rewindSettings.visibleWidgets.filter((item) => item !== widget);

    if (visible.length === 0) {
      toast({
        title: "keep at least one widget visible",
        description: "MRnObrainer needs one dashboard widget to stay usable.",
        variant: "destructive",
      });
      return;
    }

    await persist({ visibleWidgets: visible });
  };

  useEffect(() => {
    if (!hasTauriRuntime()) {
      setChatGptConnected(false);
      return;
    }

    commands.chatgptOauthStatus().then((result) => {
      if (result.status === "ok") {
        setChatGptConnected(result.data.logged_in);
      }
    });
  }, []);

  useEffect(() => {
    if (!hasTauriRuntime()) {
      setPipeInstalled(false);
      setPipeEnvStatus({
        configured: false,
        missingKeys: ["NOTION_API_KEY", "NOTION_DATABASE_ID"],
        invalidValues: [],
        fixMode: "guided",
      });
      return;
    }

    const checkPipe = async () => {
      const home = await homeDir();
      const pipeDir = await join(home, ".screenpipe", "pipes", rewindSettings.dailyReviewPipeName);
      setPipeInstalled(await exists(pipeDir));

      const envPath = await join(pipeDir, ".env");
      if (await exists(envPath)) {
        const envText = await readTextFile(envPath);
        setPipeEnvStatus(getPipeEnvStatusFromText(envText));
      } else {
        setPipeEnvStatus({
          configured: false,
          missingKeys: ["NOTION_API_KEY", "NOTION_DATABASE_ID"],
          invalidValues: [],
          fixMode: "guided",
        });
      }
    };
    checkPipe().catch(() => setPipeInstalled(false));
  }, [rewindSettings.dailyReviewPipeName]);

  const openPipeFolder = async () => {
    const home = await homeDir();
    const pipeDir = await join(home, ".screenpipe", "pipes", rewindSettings.dailyReviewPipeName);
    if (!(await exists(pipeDir))) {
      toast({
        title: "pipe folder not found",
        description: "Install the daily-review pipe first.",
        variant: "destructive",
      });
      return;
    }
    await revealItemInDir(pipeDir);
  };

  const openOutputFolder = async () => {
    const home = await homeDir();
    const outputDir = await join(home, ".screenpipe", "pipes", rewindSettings.dailyReviewPipeName, "output");
    if (!(await exists(outputDir))) {
      toast({
        title: "output folder not found",
        description: "Run the daily review once to generate local artifacts.",
        variant: "destructive",
      });
      return;
    }
    await revealItemInDir(outputDir);
  };

  const openEnvFile = async () => {
    const home = await homeDir();
    const envPath = await join(home, ".screenpipe", "pipes", rewindSettings.dailyReviewPipeName, ".env");
    if (!(await exists(envPath))) {
      toast({
        title: "env file not found",
        description: "The pipe-local .env file is missing.",
        variant: "destructive",
      });
      return;
    }
    await revealItemInDir(envPath);
  };

  const handleLogin = async () => {
    setAuthLoading(true);
    try {
      const result = await commands.chatgptOauthLogin();
      setChatGptConnected(result.status === "ok" && result.data);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      await commands.chatgptOauthLogout();
      setChatGptConnected(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const notionStatusLabel = pipeEnvStatus.configured
    ? "notion connected"
    : pipeEnvStatus.invalidValues.length > 0
      ? "notion needs attention"
      : "notion setup needed";
  const notionStatusDetail = pipeEnvStatus.configured
    ? "Daily review can use your saved connector details."
    : pipeEnvStatus.invalidValues.length > 0
      ? "Saved connector values still use placeholders. Finish the guided setup or update the manual override."
      : "The daily review pipe is waiting for connector details.";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">MRnObrainer</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Founder-alpha defaults for MRnObrainer: dashboard behavior, guided OpenClaw pairing, local-first automation guardrails, and fallback OAuth controls.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rewind-goal">Default goal</Label>
            <Input
              id="rewind-goal"
              value={rewindSettings.goal}
              onChange={(event) => persist({ goal: event.target.value })}
              placeholder="Set the one thing that should move today"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rewind-pipe-name">Daily review pipe name</Label>
            <Input
              id="rewind-pipe-name"
              value={rewindSettings.dailyReviewPipeName}
              onChange={(event) => persist({ dailyReviewPipeName: event.target.value.trim() || getDefaultRewindSettings().dailyReviewPipeName })}
            />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {pipeInstalled ? "pipe installed" : "pipe not installed"}
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {notionStatusLabel}
              </span>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-2" onClick={openPipeFolder}>
                <FolderOpen className="h-3.5 w-3.5" />
                Open pipe folder
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-2" onClick={openOutputFolder}>
                <FolderOpen className="h-3.5 w-3.5" />
                Open output
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {notionStatusDetail}
            </p>
            <div className="rounded-2xl border border-border/60 bg-muted/10 p-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setShowManualOverrides((value) => !value)}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Manual overrides
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Open the raw connector file only if guided setup is not enough.
                  </p>
                </div>
                {showManualOverrides ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {showManualOverrides ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                  <Button type="button" variant="outline" size="sm" className="h-8 gap-2" onClick={openEnvFile}>
                    <FolderOpen className="h-3.5 w-3.5" />
                    Open .env
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Use this only for manual connector fixes or placeholder cleanup.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <ClawFleetCard
        claws={rewindSettings.claws}
        guardrails={rewindSettings.automationGuardrails}
        onPersist={async (updates) =>
          persist({
            claws: updates.claws ?? rewindSettings.claws,
            automationGuardrails:
              updates.automationGuardrails ?? rewindSettings.automationGuardrails,
          })
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LayoutGrid className="h-4 w-4" />
            Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div>
              <p className="font-medium text-foreground">Lock dashboard location</p>
              <p className="mt-1 text-sm text-muted-foreground">
                When enabled, the main MRnObrainer window reopens in the same spot instead of drifting.
              </p>
            </div>
            <Switch
              checked={rewindSettings.dashboardLocationLocked}
              onCheckedChange={(checked) => persist({ dashboardLocationLocked: checked })}
            />
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">Widget stack</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Show or hide widgets and reorder the default dashboard layout.
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {rewindSettings.visibleWidgets.length}/{getDefaultDashboardWidgets().length} visible
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {rewindSettings.widgetOrder.map((widget, index) => {
                const meta = DASHBOARD_WIDGET_LABELS[widget];
                const isVisible = rewindSettings.visibleWidgets.includes(widget);
                return (
                  <div
                    key={widget}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/70 p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{meta.title}</p>
                      <p className="text-sm text-muted-foreground">{meta.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={isVisible}
                        onCheckedChange={(checked) => toggleWidget(widget, checked)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveWidget(widget, -1)}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveWidget(widget, 1)}
                        disabled={index === rewindSettings.widgetOrder.length - 1}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scheduled delivery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-foreground">Dashboard inbox</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Scheduled runs land in the translucent Cmd+Shift+O overlay first, so delivery stays local and visible before it fans out anywhere else.
                </p>
              </div>
              <Switch
                checked={rewindSettings.delivery.dashboard.enabled}
                onCheckedChange={(checked) =>
                  persistDelivery({ dashboard: { enabled: checked } })
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-foreground">Telegram follow-up</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Mirror the same scheduled output to Telegram when you want the recap off-device.
                </p>
              </div>
              <Switch
                checked={rewindSettings.delivery.telegram.enabled}
                onCheckedChange={(checked) =>
                  persistDelivery({ telegram: { enabled: checked } })
                }
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Built-in first-party briefings use the same delivery path as scheduled pipes. The default morning brief stays local-first unless Telegram is enabled here.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rewind-telegram-token">Telegram bot token</Label>
              <Input
                id="rewind-telegram-token"
                type="password"
                value={rewindSettings.delivery.telegram.botToken}
                onChange={(event) =>
                  persistDelivery({
                    telegram: { botToken: event.target.value },
                  })
                }
                placeholder="123456789:AA..."
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rewind-telegram-chat-id">Telegram chat ID</Label>
              <Input
                id="rewind-telegram-chat-id"
                value={rewindSettings.delivery.telegram.chatId}
                onChange={(event) =>
                  persistDelivery({
                    telegram: { chatId: event.target.value.trim() },
                  })
                }
                placeholder="-1001234567890"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Leave Telegram off if you want delivery to stay local-only. When it
            is enabled, the dashboard inbox remains the primary surface and
            Telegram becomes a follow-up mirror.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Model policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div>
              <p className="font-medium text-foreground">Safer default: local models</p>
              <p className="mt-1 text-sm text-muted-foreground">
                MRnObrainer prefers local models for planning and automation. Use OAuth only when a remote provider is genuinely needed.
              </p>
              {rewindSettings.aiProvider !== "native-ollama" &&
              !rewindSettings.automationGuardrails.oauthWarningDismissed ? (
                <p className="mt-2 text-sm text-amber-600">
                  Cloud/OAuth can expose task context off-device; local models are safer.
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {chatGptConnected ? "connected" : "not connected"}
              </span>
              {chatGptConnected ? (
                <Button type="button" variant="outline" onClick={handleLogout} disabled={authLoading} className="gap-2">
                  {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  Disconnect OAuth
                </Button>
              ) : (
                <Button type="button" onClick={handleLogin} disabled={authLoading} className="gap-2">
                  {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  Connect OAuth
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-4 w-4" />
            Automation safety
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div>
              <p className="font-medium text-foreground">Trusted autopilot</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep this off until you trust the execution flow. MRnObrainer defaults to explicit confirmation before more sensitive work.
              </p>
            </div>
            <Switch
              checked={rewindSettings.trustedAutopilot}
              onCheckedChange={(checked) => persist({ trustedAutopilot: checked })}
            />
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div>
              <p className="font-medium text-foreground">Ask before privileged actions</p>
              <p className="mt-1 text-sm text-muted-foreground">
                When enabled, workflows should stop before privileged or out-of-scope local actions.
              </p>
            </div>
            <Switch
              checked={rewindSettings.askBeforePrivilegedActions}
              onCheckedChange={(checked) => persist({ askBeforePrivilegedActions: checked })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
            <div className="space-y-2">
              <Label htmlFor="rewind-allowed-paths">Allowed folders</Label>
              <Textarea
                id="rewind-allowed-paths"
                value={rewindSettings.allowedPaths.join("\n")}
                onChange={(event) =>
                  persist({
                    allowedPaths: event.target.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="/Users/you/Projects/app\n/Users/you/Documents"
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rewind-retention">Rollback retention (days)</Label>
                <Input
                  id="rewind-retention"
                  type="number"
                  min={1}
                  value={rewindSettings.rollbackRetentionDays}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    persist({ rollbackRetentionDays: Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 30 });
                  }}
                />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div>
                  <p className="font-medium text-foreground">Never expire rollback ledger</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Keep local change records until you clean them up manually.
                  </p>
                </div>
                <Switch
                  checked={rewindSettings.neverExpireRollback}
                  onCheckedChange={(checked) => persist({ neverExpireRollback: checked })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
