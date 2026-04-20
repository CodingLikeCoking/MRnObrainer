import { describe, expect, it } from "vitest";

import {
  getInitialSlideForMode,
  getSlidesForMode,
  resolveOnboardingMode,
} from "@/lib/onboarding-flow";

describe("onboarding-flow", () => {
  it("starts setup mode with trust/privacy and keeps worker pairing out of the default path", () => {
    const slides = getSlidesForMode("setup");

    expect(slides[0]).toBe("privacy");
    expect(slides).toContain("permissions");
    expect(slides).toContain("tour");
    expect(slides).not.toContain("pair-worker");
    expect(slides[slides.length - 1]).toBe("shortcut");
  });

  it("keeps learn mode replayable without permission gating", () => {
    const slides = getSlidesForMode("learn");

    expect(slides).toEqual(["privacy", "tour", "shortcut"]);
    expect(getInitialSlideForMode("learn")).toBe("privacy");
  });

  it("falls legacy pair_worker mode back to setup", () => {
    expect(resolveOnboardingMode("pair_worker")).toBe("setup");
    expect(getInitialSlideForMode(resolveOnboardingMode("pair_worker"))).toBe("privacy");
  });
});
