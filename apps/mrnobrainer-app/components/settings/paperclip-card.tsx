"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Network, Save, ShieldCheck } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/lib/hooks/use-settings";
import { getDefaultPaperclipSettings, getDefaultRewindSettings } from "@/lib/rewind/home-model";
import { PaperclipClient } from "@/lib/rewind/paperclip-client";

type DraftState = ReturnType<typeof getDefaultPaperclipSettings>;

function clampPollInterval(value: number, minimum: number, fallback: number) {
  const normalized = Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.max(minimum, normalized || fallback);
}

export function PaperclipCard() {
  const { settings, updateSettings } = useSettings();
  const paperclip = useMemo(
    () => settings.rewind?.paperclip || getDefaultPaperclipSettings(),
    [settings.rewind?.paperclip]
  );
  const [draft, setDraft] = useState<DraftState>(paperclip);
  const [isTesting, setIsTesting] = useState(false);
  const [testState, setTestState] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    setDraft(paperclip);
  }, [paperclip]);

  const setField = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setTestState(null);
  };

  const persist = async () => {
    const rewindSettings = settings.rewind || getDefaultRewindSettings();
    const nextDraft = {
      ...draft,
      pollIntervalSec: clampPollInterval(draft.pollIntervalSec, 5, 5),
      backgroundPollIntervalSec: clampPollInterval(
        draft.backgroundPollIntervalSec,
        10,
        20
      ),
    };
    await updateSettings({
      rewind: {
        ...rewindSettings,
        paperclip: nextDraft,
      },
    });
    setDraft(nextDraft);
    setTestState({
      ok: true,
      message: nextDraft.enabled
        ? "Paperclip connection saved."
        : "Paperclip connection saved but disabled.",
    });
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestState(null);
    try {
      const client = new PaperclipClient(draft);
      const snapshot = await client.fetchOfficeSnapshot();
      if (snapshot.admin.mode === "error") {
        throw new Error(snapshot.admin.errorMessage || "Paperclip returned partial data.");
      }
      setTestState({
        ok: true,
        message: `Connected to ${snapshot.company.name} with ${snapshot.company.activeAgents} active agents.`,
      });
    } catch (error) {
      setTestState({
        ok: false,
        message: error instanceof Error ? error.message : "Paperclip connection failed.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-start gap-4 p-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-white">
            <Network className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Paperclip</h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Control plane
              </span>
              {draft.enabled ? (
                <Badge className="rounded-full bg-emerald-600/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  enabled
                </Badge>
              ) : null}
            </div>
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              Use Paperclip as the orchestration layer for the office dashboard. MRnObrainer stays the
              local capture and execution surface.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Base URL
                </span>
                <Input
                  value={draft.baseUrl}
                  onChange={(event) => setField("baseUrl", event.target.value)}
                  placeholder="http://localhost:3100"
                  className="h-9 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Company ID
                </span>
                <Input
                  value={draft.activeCompanyId}
                  onChange={(event) => setField("activeCompanyId", event.target.value)}
                  placeholder="company-1"
                  className="h-9 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Company name
                </span>
                <Input
                  value={draft.activeCompanyName}
                  onChange={(event) => setField("activeCompanyName", event.target.value)}
                  placeholder="Optional display name"
                  className="h-9 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  API token
                </span>
                <Input
                  type="password"
                  value={draft.apiToken}
                  onChange={(event) => setField("apiToken", event.target.value)}
                  placeholder="Bearer token"
                  className="h-9 text-sm"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Home poll (sec)
                </span>
                <Input
                  type="number"
                  min={5}
                  value={draft.pollIntervalSec}
                  onChange={(event) => setField("pollIntervalSec", Number(event.target.value) || 5)}
                  className="h-9 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Background poll (sec)
                </span>
                <Input
                  type="number"
                  min={10}
                  value={draft.backgroundPollIntervalSec}
                  onChange={(event) =>
                    setField("backgroundPollIntervalSec", Number(event.target.value) || 20)
                  }
                  className="h-9 text-sm"
                />
              </label>
              <div className="flex items-end justify-between rounded-xl border border-border/60 bg-muted/15 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Enable office control plane</p>
                  <p className="text-xs text-muted-foreground">Use Paperclip as the live office source.</p>
                </div>
                <Switch
                  checked={draft.enabled}
                  onCheckedChange={(checked) => setField("enabled", checked)}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" className="gap-2" onClick={persist}>
                <Save className="h-4 w-4" />
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={isTesting}
                onClick={handleTest}
              >
                {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Test connection
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="gap-2"
                onClick={() =>
                  openUrl(
                    draft.baseUrl.trim() || "https://github.com/paperclipai/paperclip"
                  )
                }
              >
                <ExternalLink className="h-4 w-4" />
                Open Paperclip
              </Button>
            </div>

            {testState ? (
              <div
                className={`mt-4 rounded-xl border px-3 py-2 text-xs ${
                  testState.ok
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-700"
                }`}
              >
                {testState.message}
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
