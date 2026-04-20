import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ShortcutSection from "@/components/settings/shortcut-section";

vi.mock("@/lib/hooks/use-settings", () => ({
  useSettings: () => ({
    settings: {
      showScreenpipeShortcut: "Shift+Super+O",
      showChatShortcut: "Control+Super+L",
      searchShortcut: "Control+Super+K",
      startRecordingShortcut: "Super+Alt+U",
      stopRecordingShortcut: "Super+Alt+X",
      startAudioShortcut: "",
      stopAudioShortcut: "",
      disabledShortcuts: [],
      showShortcutOverlay: true,
    },
    updateSettings: vi.fn(),
  }),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-os", () => ({
  platform: () => "macos",
}));

describe("ShortcutSection", () => {
  it("renames the main shortcut and reminder copy to MRnObrainer", () => {
    render(<ShortcutSection />);

    expect(screen.getByText("toggle MRnObrainer dashboard")).toBeInTheDocument();
    expect(screen.getByText("show/hide the MRnObrainer dashboard")).toBeInTheDocument();
    expect(screen.getByText("Overlay showing the MRnObrainer shortcut")).toBeInTheDocument();
  });
});
