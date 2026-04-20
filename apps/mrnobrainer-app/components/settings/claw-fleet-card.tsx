"use client";

import { ShieldAlert, ShieldCheck, Sparkles, Swords, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type {
  RewindAutomationGuardrails,
  RewindClawWorker,
} from "@/lib/rewind/home-model";

type ClawFleetCardProps = {
  claws: RewindClawWorker[];
  guardrails: RewindAutomationGuardrails;
  onPersist: (updates: {
    claws?: RewindClawWorker[];
    automationGuardrails?: RewindAutomationGuardrails;
  }) => void | Promise<void>;
};

function createClawWorker(index: number): RewindClawWorker {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `claw-remote-${Date.now()}-${index}`;

  return {
    id,
    hostId: `host-remote-${index}`,
    name: `Worker ${index}`,
    title: "Worker",
    levelLabel: "Lv. 2",
    locationLabel: "Remote worker",
    modelLabel: "Local model",
    status: "idle",
    currentTask: "Waiting for a background automation",
    lastHeartbeatLabel: "Just paired",
    healthScore: 92,
    executorPreference: ["remote-openclaw", "local-openclaw", "local-pipe", "external-tool"],
    role: "worker",
  };
}

function formatExecutorLabel(value: string) {
  return value.replace(/-/g, " ");
}

export function ClawFleetCard({ claws, guardrails, onPersist }: ClawFleetCardProps) {
  const roster = claws;

  const updateGuardrails = async (updates: Partial<RewindAutomationGuardrails>) => {
    await onPersist({
      automationGuardrails: {
        ...guardrails,
        ...updates,
      },
    });
  };

  const addClaw = async () => {
    const nextIndex = roster.filter((claw) => claw.role === "worker").length + 1;

    await onPersist({
      claws: [...roster, createClawWorker(nextIndex)],
    });
  };

  const removeClaw = async (id: string) => {
    await onPersist({
      claws: roster.filter((claw) => claw.id !== id),
    });
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Swords className="h-4 w-4" />
              Oracle + Workers
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              This Mac stays the oracle. Pair local or remote workers to run automations without interrupting the machine you are actively using.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="gap-2" onClick={addClaw}>
              <Plus className="h-4 w-4" />
              Add worker
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
            Executor order: local pipe -&gt; local OpenClaw -&gt; remote OpenClaw -&gt; external tool
          </Badge>
          {guardrails.nonTechnicalMode ? (
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
              Guided setup for non-technical users
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!guardrails.oauthWarningDismissed ? (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-600" />
              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-sm text-foreground">
                  Cloud/OAuth can expose task context off-device; local models are safer.
                </p>
                <div className="flex flex-wrap gap-2">
                  {!guardrails.allowCloudBypass ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => updateGuardrails({ allowCloudBypass: true })}
                    >
                      Continue anyway
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateGuardrails({ oauthWarningDismissed: true })}
                  >
                    Don&apos;t ask again
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 p-4">
          <div>
            <p className="font-medium text-foreground">Allow cloud/OAuth bypass</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep this on if you want a single-click override for remote or OAuth-backed automations.
            </p>
          </div>
          <Switch
            checked={guardrails.allowCloudBypass}
            onCheckedChange={(checked) => updateGuardrails({ allowCloudBypass: checked })}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {roster.map((claw) => (
            <div
              key={claw.id}
              className="rounded-2xl border border-border/60 bg-background/80 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{claw.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{claw.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-[0.15em]">
                    {claw.status.replace("-", " ")}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeClaw(claw.id)}
                    aria-label={`remove ${claw.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{claw.locationLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{claw.modelLabel}</span>
                </div>
                <p>Heartbeat: {claw.lastHeartbeatLabel}</p>
                <p>Health: {claw.healthScore}%</p>
                <p className="text-foreground">{claw.currentTask}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {claw.executorPreference.map((executor) => (
                          <Badge key={executor} variant="secondary" className="rounded-full px-3 py-1 text-xs">
                            {formatExecutorLabel(executor)}
                          </Badge>
                        ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
