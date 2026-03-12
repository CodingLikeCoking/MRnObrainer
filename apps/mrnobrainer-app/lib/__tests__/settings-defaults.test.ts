import { describe, expect, it } from "vitest";
import { createDefaultSettingsObject } from "../hooks/use-settings";

describe("default desktop settings", () => {
  it("starts fresh installs with a local AI preset", () => {
    const settings = createDefaultSettingsObject({ aiPresets: [] as any });

    expect(settings.aiPresets).toHaveLength(1);
    expect(settings.aiPresets[0]?.provider).toBe("native-ollama");
    expect(settings.aiPresets[0]?.url).toBe("http://localhost:11434/v1");
    expect(settings.aiPresets[0]?.defaultPreset).toBe(true);
  });

  it("drops cloud AI presets from runtime defaults", () => {
    const settings = createDefaultSettingsObject({
      aiPresets: [
        {
          id: "cloud-default",
          provider: "screenpipe-cloud",
          url: "https://api.screenpi.pe/v1",
          model: "screenpipe",
          defaultPreset: true,
          apiKey: null,
          maxContextChars: 200000,
          prompt: "",
        },
      ] as any,
    });

    expect(
      settings.aiPresets.some((preset) => preset.provider === "screenpipe-cloud"),
    ).toBe(false);
    expect(settings.aiPresets[0]?.provider).toBe("native-ollama");
    expect(settings.aiPresets[0]?.defaultPreset).toBe(true);
  });
});
