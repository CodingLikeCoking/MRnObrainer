import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getRuntimeSurface,
  hasTauriRuntime,
} from "@/lib/runtime-environment";

describe("runtime-environment", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("treats plain browser UI-only mode as non-tauri", () => {
    vi.stubGlobal("window", {});

    expect(hasTauriRuntime()).toBe(false);
    expect(getRuntimeSurface()).toBe("browser");
  });

  it("detects the tauri runtime when internals expose invoke", () => {
    vi.stubGlobal("window", {
      __TAURI_INTERNALS__: {
        invoke: vi.fn(),
      },
    });

    expect(hasTauriRuntime()).toBe(true);
    expect(getRuntimeSurface()).toBe("tauri");
  });
});
