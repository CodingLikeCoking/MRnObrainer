"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  requestScreenCaptureRecovery,
  useCaptureStatusSnapshot,
  formatCaptureTarget,
  formatCaptureTimestamp,
  isPermissionGranted,
} from "@/lib/capture-health";
import { commands } from "@/lib/utils/tauri";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Monitor,
  RadioTower,
  RefreshCw,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { PRODUCT_NAME } from "@/lib/product-config";

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
  const { permissions, health, verificationState, recoveryState, refresh } = useCaptureStatusSnapshot(compact ? 7000 : 5000);
  const screenGranted = isPermissionGranted(permissions?.screenRecording);
  const isRecoveryInFlight =
    recoveryState === "granted_pending_relaunch" || recoveryState === "relaunching";
  const isAwaitingGrant = !screenGranted && isRecoveryInFlight;
  const isAwaitingRelaunch = screenGranted && isRecoveryInFlight;
  const screenPermissionMissing = verificationState === "missing" && !isRecoveryInFlight;

  const openScreenRecordingSettings = async () => {
    await requestScreenCaptureRecovery();
    try {
      await commands.requestPermission("screenRecording");
    } catch {
      await commands.openPermissionSettings("screenRecording");
    }
    await refresh();
  };

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

  if (screenPermissionMissing) {
    return (
      <Card className="border-amber-400/40 bg-amber-50/80 shadow-[0_18px_70px_rgba(245,158,11,0.12)] dark:bg-amber-950/20">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <Badge
                variant="outline"
                className="w-fit rounded-full border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300"
              >
                Local setup blocker
              </Badge>
              <CardTitle className="flex items-center gap-2 text-xl">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Screen Recording is blocking {PRODUCT_NAME}
              </CardTitle>
              <p className="max-w-2xl text-sm text-muted-foreground">
                The local capture backend cannot start until macOS grants Screen Recording.
                Sign-in and cloud sync are not required for local capture.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={openScreenRecordingSettings} className="gap-2">
                <Settings className="h-4 w-4" />
                Open Screen Recording Settings
              </Button>
              <Button type="button" variant="outline" onClick={refresh} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Re-check
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  if (isAwaitingGrant || isAwaitingRelaunch) {
    return (
      <Card className="border-sky-300/40 bg-sky-50/80 shadow-[0_18px_70px_rgba(14,165,233,0.12)] dark:bg-sky-950/20">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <Badge
                variant="outline"
                className="w-fit rounded-full border-sky-500/40 bg-sky-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300"
              >
                Capture recovery
              </Badge>
              <CardTitle className="flex items-center gap-2 text-xl">
                {isAwaitingRelaunch ? (
                  <CheckCircle2 className="h-5 w-5 text-sky-600" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
                )}
                {isAwaitingRelaunch
                  ? `${PRODUCT_NAME} is relaunching capture`
                  : "Finish Screen Recording in macOS"}
              </CardTitle>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {isAwaitingRelaunch
                  ? "macOS accepted Screen Recording. MRnObrainer is waiting to relaunch and bind the local capture pipeline."
                  : "Enable MRnObrainer in System Settings → Privacy & Security → Screen & System Audio Recording, then come back here. The app will relaunch automatically once macOS confirms the change."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!isAwaitingRelaunch && (
                <Button type="button" onClick={openScreenRecordingSettings} className="gap-2">
                  <Settings className="h-4 w-4" />
                  Open Screen Recording Settings
                </Button>
              )}
              <Button type="button" variant="outline" onClick={refresh} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Re-check
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

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
