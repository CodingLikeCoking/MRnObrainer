import { describe, expect, it } from "vitest";

import { getTimelineStatusState } from "@/lib/timeline-status";

describe("getTimelineStatusState", () => {
  it("prioritizes missing screen permission over generic backend errors", () => {
    const state = getTimelineStatusState({
      hasFrames: false,
      hasCurrentFrame: false,
      isLoading: false,
      hasConnectionError: true,
      isServerDown: true,
      screenPermission: "denied",
      verificationState: "missing",
    });

    expect(state.kind).toBe("permission_blocked");
    expect(state.title).toContain("Screen Recording");
  });

  it("shows relaunch-required after permission is granted but frames are not flowing yet", () => {
    const state = getTimelineStatusState({
      hasFrames: false,
      hasCurrentFrame: false,
      isLoading: false,
      hasConnectionError: false,
      isServerDown: false,
      screenPermission: "granted",
      verificationState: "granted_pending_relaunch",
    });

    expect(state.kind).toBe("relaunch_required");
    expect(state.primaryAction).toBe("recheck");
  });

  it("falls back to backend offline when permissions are granted but the local API is down", () => {
    const state = getTimelineStatusState({
      hasFrames: false,
      hasCurrentFrame: false,
      isLoading: false,
      hasConnectionError: true,
      isServerDown: true,
      screenPermission: "granted",
      verificationState: "verified",
    });

    expect(state.kind).toBe("backend_offline");
    expect(state.primaryAction).toBe("restart_backend");
  });

  it("returns a warmup state while capture is starting", () => {
    const state = getTimelineStatusState({
      hasFrames: false,
      hasCurrentFrame: false,
      isLoading: false,
      hasConnectionError: false,
      isServerDown: false,
      screenPermission: "granted",
      verificationState: "verified",
    });

    expect(state.kind).toBe("warming_up");
  });
});
