"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCaptureStatusSnapshot, formatCaptureTarget, formatCaptureTimestamp } from "@/lib/capture-health";
import { Monitor, RadioTower, ShieldCheck } from "lucide-react";

const STATE_LABELS = {
  missing: "Permission missing",
  granted_pending_relaunch: "Awaiting relaunch",
  relaunching: "Relaunching",
  verified: "Verified",
} as const;

export function CaptureHealthCard({
  title = "Capture health",
  compact = false,
}: {
  title?: string;
  compact?: boolean;
}) {
  const { health, verificationState } = useCaptureStatusSnapshot(compact ? 7000 : 5000);

  const content = (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Screen
        </p>
        <p className="mt-2 text-sm font-medium text-foreground">
          {STATE_LABELS[verificationState]}
        </p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Target
        </p>
        <p className="mt-2 text-sm font-medium text-foreground">
          {formatCaptureTarget(health)}
        </p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Last frame
        </p>
        <p className="mt-2 text-sm font-medium text-foreground">
          {formatCaptureTimestamp(health?.last_frame_timestamp)}
        </p>
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-card px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{title}</p>
          </div>
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
            {STATE_LABELS[verificationState]}
          </Badge>
        </div>
        {content}
      </div>
    );
  }

  return (
    <Card className="border-border/60 bg-background/95">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-4 w-4" />
            {title}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
              <Monitor className="mr-1.5 h-3 w-3" />
              {formatCaptureTarget(health)}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
              <RadioTower className="mr-1.5 h-3 w-3" />
              {STATE_LABELS[verificationState]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
