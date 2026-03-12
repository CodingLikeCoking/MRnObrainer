import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAutomationDraftBundle,
  deriveAutomationOpportunities,
  installAutomationDraftBundle,
} from "@/lib/rewind/automation-runtime";
import type { RewindAutomationOpportunity } from "@/lib/rewind/home-model";
import { exists, mkdir, writeTextFile } from "@tauri-apps/plugin-fs";
import { homeDir } from "@tauri-apps/api/path";

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn(),
  mkdir: vi.fn(),
  writeTextFile: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({
  homeDir: vi.fn(),
  join: vi.fn((...parts: string[]) => parts.join("/")),
}));

describe("automation runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(homeDir).mockResolvedValue("/Users/test/");
    vi.mocked(exists).mockResolvedValue(false);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ success: true, name: "nobrainer-turn-todays-dev-loop-into-a-workflow" }),
      }))
    );
  });

  it("derives evidence-backed automation opportunities from repeated local activity", () => {
    const opportunities = deriveAutomationOpportunities({
      goal: "Ship the founder alpha and send an end-of-day update",
      items: [
        { type: "OCR", content: { timestamp: "2026-03-07T01:00:00.000Z", app_name: "Cursor" } },
        { type: "Input", content: { timestamp: "2026-03-07T01:03:00.000Z", app_name: "Terminal" } },
        { type: "OCR", content: { timestamp: "2026-03-07T01:08:00.000Z", app_name: "Arc" } },
        { type: "Input", content: { timestamp: "2026-03-07T01:14:00.000Z", app_name: "Cursor" } },
        { type: "OCR", content: { timestamp: "2026-03-07T01:18:00.000Z", app_name: "Terminal" } },
        { type: "OCR", content: { timestamp: "2026-03-07T08:00:00.000Z", app_name: "Notion" } },
        { type: "Input", content: { timestamp: "2026-03-07T08:04:00.000Z", app_name: "Slack" } },
        { type: "OCR", content: { timestamp: "2026-03-07T08:09:00.000Z", app_name: "Arc" } },
        { type: "Input", content: { timestamp: "2026-03-07T08:13:00.000Z", app_name: "Notion" } },
      ],
      review: {
        dateKey: "2026-03-07",
        headline: "Founder alpha kept moving",
        oneLiner: "Closed loops across build and updates.",
        narrativeSummary: "You shipped product work, synced decisions into Notion, and prepared a concise update.",
        topApps: ["Cursor", "Terminal", "Notion"],
        statusLabel: "On a roll",
      },
      branchGraph: {
        mergeStatusLabel: "Cross-device day merge",
        lanes: [
          {
            deviceId: "mac-local",
            label: "This Mac",
            platformLabel: "macOS",
            freshnessLabel: "live",
            summary: "Cursor, Terminal",
            buckets: [],
          },
          {
            deviceId: "ios-phone",
            label: "Phone",
            platformLabel: "iPhone",
            freshnessLabel: "27m ago",
            summary: "Slack, Messages",
            buckets: [],
          },
        ],
      },
      now: new Date("2026-03-07T10:00:00.000Z"),
    });

    expect(opportunities.map((opportunity) => opportunity.id)).toEqual([
      "developer-workflow",
      "founder-update",
    ]);
    expect(opportunities[0]?.evidenceSummary).toContain("Cursor");
    expect(opportunities[0]?.sourceDevices).toEqual(["This Mac", "Phone"]);
    expect(opportunities[0]?.repetitionCount).toBeGreaterThanOrEqual(3);
    expect(opportunities[0]?.walkthrough?.length).toBeGreaterThanOrEqual(3);
    expect(opportunities[1]?.recommendedSchedule).toBe("every day at 6pm");
  });

  it("creates a disabled draft bundle with automation metadata", () => {
    const bundle = createAutomationDraftBundle({
      opportunity: {
        id: "founder-update",
        title: "Automate your founder update",
        summary: "Turn product and communication signals into a repeatable end-of-day update.",
        lane: "personal-ops",
        evidenceSummary: "I saw product work flow into Notion and Slack 4 times today.",
        repetitionCount: 4,
        timeSavedMinutes: 18,
        confidence: 0.84,
        sourceDevices: ["This Mac", "Phone"],
        recommendedSchedule: "every day at 6pm",
        riskLevel: "low",
        requiredPermissions: ["screenpipe-search", "screenpipe-elements"],
        walkthrough: [
          {
            id: "step-1",
            title: "Capture the product changes",
            detail: "The same product notes loop showed up across Cursor, Notion, and Slack.",
            timestampLabel: "18:00",
            appName: "Notion",
            deviceLabel: "This Mac",
          },
        ],
      },
      goal: "Send a clean end-of-day update",
      allowedPaths: ["/Users/test/Documents"],
      askBeforePrivilegedActions: true,
      trustedAutopilot: false,
    });

    expect(bundle.pipeMd).toContain("enabled: false");
    expect(bundle.pipeMd).toContain("schedule: \"every day at 6pm\"");
    expect(bundle.pipeMd).toContain("Ask for confirmation before any privileged");

    const automationJson = JSON.parse(bundle.automationJson) as Record<string, unknown>;
    expect(automationJson.sourceOpportunityId).toBe("founder-update");
    expect(automationJson.approvalMode).toBe("explicit-confirmation");
    expect(automationJson.walkthrough).toBeInstanceOf(Array);
  });

  it("stages the drafted bundle and installs it through the local Screenpipe pipe API", async () => {
    const bundle = createAutomationDraftBundle({
      opportunity: {
        id: "developer-workflow",
        title: "Turn today’s dev loop into a workflow",
        summary: "Package the repo, env, and run steps into one repeatable flow.",
        lane: "developer",
      } satisfies RewindAutomationOpportunity,
      goal: "Ship the founder alpha",
      allowedPaths: ["/Users/test/Projects/screenpipe"],
      askBeforePrivilegedActions: true,
      trustedAutopilot: false,
    });

    const installResult = await installAutomationDraftBundle(bundle, "http://localhost:3030");

    expect(installResult.directoryPath).toBe("/Users/test//.screenpipe/automation-drafts/nobrainer-turn-todays-dev-loop-into-a-workflow");
    expect(vi.mocked(mkdir)).toHaveBeenCalledWith(
      "/Users/test//.screenpipe/automation-drafts/nobrainer-turn-todays-dev-loop-into-a-workflow",
      { recursive: true }
    );
    expect(vi.mocked(writeTextFile)).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3030/pipes/install",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "/Users/test//.screenpipe/automation-drafts/nobrainer-turn-todays-dev-loop-into-a-workflow",
        }),
      }
    );
    expect(installResult.pipeName).toBe("nobrainer-turn-todays-dev-loop-into-a-workflow");
  });
});
