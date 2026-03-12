import { describe, expect, it } from "vitest";

import {
  deriveCaptureVerificationState,
  isCaptureOperational,
} from "@/lib/capture-health";

describe("capture-health", () => {
  it("treats disabled frame capture as a verified state", () => {
    expect(
      deriveCaptureVerificationState({
        permissions: {
          screenRecording: "granted",
          microphone: "granted",
          accessibility: "granted",
        },
        health: {
          frame_status: "disabled",
          status: "healthy",
        },
        recoveryState: null,
      })
    ).toBe("verified");
  });

  it("marks relaunching when screen access is granted but frames are still missing", () => {
    expect(
      deriveCaptureVerificationState({
        permissions: {
          screenRecording: "granted",
          microphone: "granted",
          accessibility: "granted",
        },
        health: {
          frame_status: "not_started",
          status: "degraded",
        },
        recoveryState: "relaunching",
      })
    ).toBe("relaunching");
  });

  it("recognizes either a live frame status or a cached last-frame timestamp as operational capture", () => {
    expect(isCaptureOperational({ frame_status: "ok" })).toBe(true);
    expect(
      isCaptureOperational({
        frame_status: "stale",
        last_frame_timestamp: "2026-03-10T10:00:00.000Z",
      })
    ).toBe(true);
    expect(isCaptureOperational({ frame_status: "not_started" })).toBe(false);
  });
});
