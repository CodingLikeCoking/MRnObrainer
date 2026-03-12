"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { commands } from "@/lib/utils/tauri";
import { requestScreenCaptureRecovery, useCaptureStatusSnapshot } from "@/lib/capture-health";
import { usePlatform } from "@/lib/hooks/use-platform";
import { listen } from "@tauri-apps/api/event";
import { PRODUCT_NAME } from "@/lib/product-config";

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

  return (
    <div className="w-full bg-destructive border-b-2 border-destructive px-4 py-3 flex items-center justify-between gap-3 z-50">
      <div className="flex items-center gap-3 min-w-0">
        <AlertTriangle className="h-5 w-5 text-destructive-foreground shrink-0" />
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-destructive-foreground text-base">
            {isAwaitingRelaunch
              ? "screen access granted"
              : `${missingPerms.join(" & ")} disabled`}
          </span>
          <span className="text-destructive-foreground/80 hidden sm:inline text-sm">
            {isAwaitingRelaunch
              ? `— ${PRODUCT_NAME} will relaunch to resume capture`
              : "— recording is paused"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="secondary"
          size="sm"
          className="h-8 px-4 text-sm font-medium"
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
        >
          {isAwaitingRelaunch ? "awaiting relaunch" : "fix permissions"}
        </Button>

      </div>
    </div>
  );
}
