"use client";

import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { commands } from "@/lib/utils/tauri";
import { requestScreenCaptureRecovery, useCaptureStatusSnapshot } from "@/lib/capture-health";
import { usePlatform } from "@/lib/hooks/use-platform";
import { listen } from "@tauri-apps/api/event";
import { PRODUCT_NAME } from "@/lib/product-config";
import { hasTauriRuntime } from "@/lib/runtime-environment";
import { cn } from "@/lib/utils";

/**
 * Persistent inline banner shown at the top of the main UI when permissions are missing.
 * Cannot be permanently dismissed — only goes away when permissions are granted.
 */
export function PermissionBanner() {
  const { isMac } = usePlatform();
  const { permissions, recoveryState, refresh } = useCaptureStatusSnapshot();

  const screenOk =
    permissions?.screenRecording === "granted" ||
    permissions?.screenRecording === "notNeeded";
  const micOk =
    permissions?.microphone === "granted" ||
    permissions?.microphone === "notNeeded";
  const accessibilityOk =
    permissions?.accessibility === "granted" ||
    permissions?.accessibility === "notNeeded";

  // Check on mount and poll every 5 seconds
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Also listen for permission-lost events for instant response
  useEffect(() => {
    if (!hasTauriRuntime()) return;

    const unlisten = listen("permission-lost", () => {
      refresh();
    });
    return () => { unlisten.then(fn => fn()); };
  }, [refresh]);

  // Don't render on non-Mac or while loading
  if (!isMac || !permissions) return null;

  // Don't render if all permissions are granted
  if (screenOk && micOk && accessibilityOk && recoveryState !== "granted_pending_relaunch") {
    return null;
  }

  const missingPerms: string[] = [];
  if (!screenOk) missingPerms.push("screen recording");
  if (!micOk) missingPerms.push("microphone");
  if (!accessibilityOk) missingPerms.push("accessibility");

  const isAwaitingRelaunch =
    recoveryState === "granted_pending_relaunch" ||
    recoveryState === "relaunching";

  const isScreenRecoveryPending = isAwaitingRelaunch && screenOk;
  const isWatchingForGrant = isAwaitingRelaunch && !screenOk;

  const bannerTone = isScreenRecoveryPending
    ? "border-sky-300/70 bg-sky-50/95 text-sky-950 dark:border-sky-500/30 dark:bg-sky-950/40 dark:text-sky-100"
    : "border-amber-300/70 bg-amber-50/95 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100";

  return (
    <div
      className={cn(
        "w-full border-b px-4 py-3 flex items-center justify-between gap-3 z-50 backdrop-blur-xl",
        bannerTone
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {isScreenRecoveryPending ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-300" />
        ) : isWatchingForGrant ? (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-amber-600 dark:text-amber-300" />
        ) : (
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
        )}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-base">
            {isScreenRecoveryPending
              ? "screen access granted"
              : isWatchingForGrant
                ? "finish screen access setup"
              : `${missingPerms.join(" & ")} disabled`}
          </span>
          <span className="hidden text-sm opacity-80 sm:inline">
            {isScreenRecoveryPending
              ? `— ${PRODUCT_NAME} will relaunch to resume capture`
              : isWatchingForGrant
                ? "— enable MRnObrainer in macOS System Settings to continue"
              : "— recording is paused"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="secondary"
          size="sm"
          className={cn(
            "h-8 px-4 text-sm font-medium border",
            isScreenRecoveryPending
              ? "border-sky-300/70 bg-white/80 text-sky-900 hover:bg-white dark:border-sky-400/30 dark:bg-sky-950/60 dark:text-sky-100"
              : "border-amber-300/70 bg-white/80 text-amber-900 hover:bg-white dark:border-amber-400/30 dark:bg-amber-950/60 dark:text-amber-100"
          )}
          onClick={async () => {
            // Try requestPermission first — this shows the native macOS dialog
            // (e.g. mic prompt, accessibility prompt). If the permission was already
            // denied, it falls back to opening System Settings internally.
            try {
              if (!screenOk) {
                await requestScreenCaptureRecovery();
                await commands.requestPermission("screenRecording");
              } else if (!micOk) {
                await commands.requestPermission("microphone");
              } else if (!accessibilityOk) {
                await commands.requestPermission("accessibility");
              }
            } catch {
              // fallback to opening settings directly
              if (!screenOk) await commands.openPermissionSettings("screenRecording");
              else if (!micOk) await commands.openPermissionSettings("microphone");
              else if (!accessibilityOk) await commands.openPermissionSettings("accessibility");
            }
          }}
          disabled={isScreenRecoveryPending || recoveryState === "relaunching"}
        >
          {isScreenRecoveryPending
            ? "awaiting relaunch"
            : isWatchingForGrant
              ? "open screen recording settings"
              : "fix permissions"}
        </Button>

      </div>
    </div>
  );
}
