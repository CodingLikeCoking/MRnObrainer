import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RewindSection } from "@/components/settings/rewind-section";

vi.mock("@/lib/hooks/use-settings", () => ({
  useSettings: () => ({
    settings: {
      rewind: {
        goal: "Ship the founder alpha",
        aiProvider: "native-ollama",
        trustedAutopilot: false,
        askBeforePrivilegedActions: true,
        allowedPaths: [],
        rollbackRetentionDays: 30,
        neverExpireRollback: false,
        dailyReviewPipeName: "rewind-daily-review",
        dashboardLocationLocked: false,
        dashboardPosition: null,
        visibleWidgets: ["goal", "ask-ai", "capture-health", "automations", "daily-review"],
        widgetOrder: ["goal", "ask-ai", "capture-health", "automations", "daily-review"],
        delivery: {
          dashboard: {
            enabled: true,
          },
          telegram: {
            enabled: false,
            botToken: "",
            chatId: "",
          },
        },
        claws: [],
        workflowCatalog: [],
        workflowAssignments: [],
        automationGuardrails: {
          preferLocalModels: true,
          oauthWarningDismissed: false,
          allowCloudBypass: true,
          nonTechnicalMode: true,
        },
        paperclip: {
          enabled: false,
          baseUrl: "",
          apiToken: "",
          activeCompanyId: "",
          activeCompanyName: "",
          pollIntervalSec: 5,
          backgroundPollIntervalSec: 20,
        },
      },
    },
    updateSettings: vi.fn(),
  }),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/lib/utils/tauri", () => ({
  commands: {
    chatgptOauthStatus: vi.fn().mockResolvedValue({ status: "ok", data: { logged_in: false } }),
    chatgptOauthLogin: vi.fn().mockResolvedValue({ status: "ok", data: true }),
    chatgptOauthLogout: vi.fn().mockResolvedValue({ status: "ok" }),
  },
}));

vi.mock("@tauri-apps/api/path", () => ({
  homeDir: vi.fn().mockResolvedValue("/Users/test"),
  join: vi.fn((...parts: string[]) => parts.join("/")),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn().mockResolvedValue(false),
  readTextFile: vi.fn().mockResolvedValue(""),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  revealItemInDir: vi.fn(),
}));

describe("RewindSection", () => {
  it("renders the MRnObrainer dashboard controls and local-first guardrails", async () => {
    render(<RewindSection />);

    expect(await screen.findByText("MRnObrainer")).toBeInTheDocument();
    expect(screen.getByText("Lock dashboard location")).toBeInTheDocument();
    expect(screen.getByText("Widget stack")).toBeInTheDocument();
    expect(screen.getByText("Today's goal")).toBeInTheDocument();
    expect(screen.getByText("Ask AI")).toBeInTheDocument();
    expect(screen.getByText("Capture health")).toBeInTheDocument();
    expect(screen.getByText("Suggested automations")).toBeInTheDocument();
    expect(screen.getByText("Call it a day")).toBeInTheDocument();
    expect(screen.getByText("Safer default: local models")).toBeInTheDocument();
    expect(screen.getByText("Scheduled delivery")).toBeInTheDocument();
    expect(screen.getByText("Telegram bot token")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manual overrides/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /open \.env/i })).not.toBeInTheDocument();
  });
});
