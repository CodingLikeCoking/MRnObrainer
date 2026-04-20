import { describe, expect, it } from "vitest";

import {
  reduceUpdateEvent,
  type UpdateSnapshot,
} from "@/lib/update-state";

describe("reduceUpdateEvent", () => {
  it("tracks the official updater flow from checking to ready_to_restart", () => {
    let state: UpdateSnapshot = {
      stage: "idle",
      version: null,
      percent: null,
      message: null,
      requiresAuth: false,
    };

    state = reduceUpdateEvent(state, { type: "checking" });
    expect(state.stage).toBe("checking");

    state = reduceUpdateEvent(state, {
      type: "available",
      version: "2.1.0",
      body: "A release is available.",
    });
    expect(state.stage).toBe("available");
    expect(state.version).toBe("2.1.0");

    state = reduceUpdateEvent(state, {
      type: "downloading",
      version: "2.1.0",
    });
    expect(state.stage).toBe("downloading");

    state = reduceUpdateEvent(state, {
      type: "progress",
      version: "2.1.0",
      percent: 65,
    });
    expect(state.percent).toBe(65);
    expect(state.stage).toBe("downloading");

    state = reduceUpdateEvent(state, {
      type: "ready",
      version: "2.1.0",
      body: "Restart to install.",
    });
    expect(state.stage).toBe("ready_to_restart");
    expect(state.percent).toBe(100);
  });

  it("marks updates as manual when authentication is required", () => {
    const state = reduceUpdateEvent(
      {
        stage: "downloading",
        version: "2.1.0",
        percent: 45,
        message: null,
        requiresAuth: false,
      },
      {
        type: "auth-required",
        version: "2.1.0",
        message: "Sign in to download this release.",
      }
    );

    expect(state.stage).toBe("manual");
    expect(state.requiresAuth).toBe(true);
    expect(state.message).toMatch(/sign in/i);
  });
});
