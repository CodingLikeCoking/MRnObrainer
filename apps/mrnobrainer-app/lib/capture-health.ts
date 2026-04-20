"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import localforage from "localforage";

import { commands, type OSPermissionsCheck, type OSPermissionStatus } from "@/lib/utils/tauri";
import { LOCAL_API_ORIGIN } from "@/lib/product-config";

export type CaptureVerificationState =
  | "missing"
  | "granted_pending_relaunch"
  | "relaunching"
  | "verified";

export interface CaptureHealthSnapshot {
  status?: string;
  frame_status?: string;
  audio_status?: string;
  last_frame_timestamp?: string | null;
  last_audio_timestamp?: string | null;
  monitors?: string[];
  device_status_details?: string | null;
  message?: string;
}

const CAPTURE_RECOVERY_STATE_KEY = "mrnobrainer.captureRecoveryState";

export function isPermissionGranted(status?: OSPermissionStatus | string | null) {
  return status === "granted" || status === "notNeeded";
}

export async function getCaptureRecoveryState(): Promise<CaptureVerificationState | null> {
  const stored = await localforage.getItem<CaptureVerificationState>(
    CAPTURE_RECOVERY_STATE_KEY
  );
  return stored || null;
}

export async function setCaptureRecoveryState(state: CaptureVerificationState) {
  await localforage.setItem(CAPTURE_RECOVERY_STATE_KEY, state);
}

export async function clearCaptureRecoveryState() {
  await localforage.removeItem(CAPTURE_RECOVERY_STATE_KEY);
}

export async function requestScreenCaptureRecovery() {
  await setCaptureRecoveryState("granted_pending_relaunch");
}

export function isCaptureOperational(health: CaptureHealthSnapshot | null) {
  return (
    health?.frame_status === "ok" ||
    health?.frame_status === "disabled" ||
    Boolean(health?.last_frame_timestamp)
  );
}

export function deriveCaptureVerificationState({
  permissions,
  health,
  recoveryState,
}: {
  permissions: OSPermissionsCheck | null;
  health: CaptureHealthSnapshot | null;
  recoveryState: CaptureVerificationState | null;
}): CaptureVerificationState {
  const screenGranted = isPermissionGranted(permissions?.screenRecording);
  const hasFrames = isCaptureOperational(health);

  if (!screenGranted) return "missing";
  if (hasFrames) return "verified";
  if (recoveryState === "relaunching") return "relaunching";
  return "granted_pending_relaunch";
}

export function formatCaptureTarget(health: CaptureHealthSnapshot | null) {
  if (health?.monitors && health.monitors.length > 0) {
    return health.monitors.join(", ");
  }

  const detail = health?.device_status_details
    ?.split(", ")
    .find((entry) => entry.includes("(input)") || entry.includes("(output)"))
    ?.split(": ")[0]
    ?.trim();

  return detail || "No screen selected";
}

export function formatCaptureTimestamp(timestamp?: string | null) {
  if (!timestamp) return "No frames yet";

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "No frames yet";

  return date.toLocaleString();
}

export function useCaptureStatusSnapshot(pollMs = 5000) {
  const [permissions, setPermissions] = useState<OSPermissionsCheck | null>(null);
  const [health, setHealth] = useState<CaptureHealthSnapshot | null>(null);
  const [recoveryState, setRecoveryStateValue] =
    useState<CaptureVerificationState | null>(null);

  const refresh = useCallback(async () => {
    const [permissionSnapshot, recoverySnapshot] = await Promise.all([
      commands.doPermissionsCheck(false).catch(() => null),
      getCaptureRecoveryState(),
    ]);

    setPermissions(permissionSnapshot);
    setRecoveryStateValue(recoverySnapshot);

    try {
      const response = await fetch(`${LOCAL_API_ORIGIN}/health`);
      if (!response.ok) return;
      const healthSnapshot = (await response.json()) as CaptureHealthSnapshot;
      setHealth(healthSnapshot);
    } catch {
      // Best effort.
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, pollMs);
    return () => window.clearInterval(interval);
  }, [pollMs, refresh]);

  const verificationState = useMemo(
    () =>
      deriveCaptureVerificationState({
        permissions,
        health,
        recoveryState,
      }),
    [permissions, health, recoveryState]
  );

  return {
    permissions,
    health,
    recoveryState,
    verificationState,
    refresh,
  };
}
