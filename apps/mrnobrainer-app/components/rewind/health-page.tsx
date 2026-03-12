"use client";

import { ShieldCheck, Sparkles } from "lucide-react";

import { UpdateBanner } from "@/components/update-banner";
import { CaptureHealthCard } from "@/components/status/capture-health-card";

export function HealthPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 pb-12">
      <section className="rounded-3xl border border-border/60 bg-background/95 p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
            <ShieldCheck className="h-5 w-5 text-foreground" />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Health
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Keep permissions and updates obvious
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              MRnObrainer should make it obvious when capture is healthy, when a signed update is
              ready, and when macOS wants a permission re-check.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-background/95 p-4">
        <UpdateBanner />
      </section>

      <CaptureHealthCard />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-border/60 bg-muted/20 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <p className="font-medium text-foreground">Signed updater policy</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Official builds update in place. Source builds still fall back to GitHub Releases.
          </p>
        </div>
        <div className="rounded-3xl border border-border/60 bg-muted/20 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <p className="font-medium text-foreground">macOS permission reality</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            In-place updates reduce reinstall churn, but macOS may still re-prompt for screen,
            audio, accessibility, or automation access over time.
          </p>
        </div>
      </section>
    </div>
  );
}
