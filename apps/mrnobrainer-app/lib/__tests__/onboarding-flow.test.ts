import { describe, expect, it } from "vitest";

import {
  getInitialSlideForMode,
  getSlidesForMode,
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

  it("limits pair_worker mode to the import flow", () => {
    expect(getSlidesForMode("pair_worker")).toEqual(["pair-worker", "shortcut"]);
    expect(getInitialSlideForMode("pair_worker")).toBe("pair-worker");
  });
});
