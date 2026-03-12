import { describe, expect, it } from "vitest";

import { getCaptureVerificationState } from "@/lib/capture-verification";

describe("capture verification", () => {
  it("does not verify capture from elapsed time alone", () => {
    const state = getCaptureVerificationState({
      seconds: 45,
      framesDetected: 0,
    });

    expect(state.canContinue).toBe(false);
    expect(state.shouldAutoAdvance).toBe(false);
    expect(state.statusLabel).toMatch(/waiting/i);
  });

  it("verifies capture once frame checks succeed", () => {
    const state = getCaptureVerificationState({
      seconds: 6,
      framesDetected: 2,
    });

    expect(state.canContinue).toBe(true);
    expect(state.shouldAutoAdvance).toBe(true);
    expect(state.detailLabel).toMatch(/2 healthy frame checks/i);
  });
});
