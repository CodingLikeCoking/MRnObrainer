import { describe, expect, it, vi } from "vitest";

import {
  buildDailyReviewSnapshot,
  buildWorkflowPrompt,
  deriveBranchGraphSnapshot,
  deriveActivitySnapshot,
  loadLatestRewindArtifacts,
} from "@/lib/rewind/home-runtime";
import { exists, readDir, readTextFile } from "@tauri-apps/plugin-fs";
import { homeDir } from "@tauri-apps/api/path";

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn(),
  readDir: vi.fn(),
  readTextFile: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({
  homeDir: vi.fn(),
  join: vi.fn((...parts: string[]) => parts.join("/")),
}));

describe("Rewind home runtime helpers", () => {
  it("derives top apps and focus minutes from today’s captured activity", () => {
    const snapshot = deriveActivitySnapshot([
      {
        type: "OCR",
        content: { timestamp: "2026-03-06T09:00:00.000Z", app_name: "Cursor" },
      },
      {
        type: "OCR",
        content: { timestamp: "2026-03-06T09:04:00.000Z", app_name: "Cursor" },
      },
      {
        type: "Accessibility",
        content: { timestamp: "2026-03-06T09:08:00.000Z", app_name: "Cursor" },
      },
      {
        type: "OCR",
        content: { timestamp: "2026-03-06T09:20:00.000Z", app_name: "Arc" },
      },
      {
        type: "Input",
        content: { timestamp: "2026-03-06T09:21:00.000Z", app_name: "Arc" },
      },
      {
        type: "OCR",
        content: { timestamp: "2026-03-06T09:24:00.000Z", app_name: "Arc" },
      },
      {
        type: "Input",
        content: { timestamp: "2026-03-06T09:25:00.000Z", app_name: "Terminal" },
      },
    ]);

    expect(snapshot.topApps).toEqual([
      { name: "Cursor", minutes: 8 },
      { name: "Arc", minutes: 4 },
      { name: "Terminal", minutes: 1 },
    ]);
    expect(snapshot.focusMinutes).toBe(12);
  });

  it("builds a review snapshot from the structured daily-review artifact", () => {
    const snapshot = buildDailyReviewSnapshot({
      dateKey: "2026-03-06",
      headline: "Closed the loop on the founder alpha",
      oneLiner: "Shipped the first Rewind-on-Screenpipe shell.",
      narrativeSummary: "Most of the day went into turning the Screenpipe fork into a founder-alpha Rewind shell.",
      topApps: [
        { appName: "Cursor", minutes: 180 },
        { appName: "Arc", minutes: 45 },
      ],
      rpg: {
        statusLabel: "Momentum held",
      },
    });

    expect(snapshot).toEqual({
      dateKey: "2026-03-06",
      headline: "Closed the loop on the founder alpha",
      oneLiner: "Shipped the first Rewind-on-Screenpipe shell.",
      narrativeSummary: "Most of the day went into turning the Screenpipe fork into a founder-alpha Rewind shell.",
      topApps: ["Cursor", "Arc"],
      statusLabel: "Momentum held",
    });
  });

  it("builds a compact local branch graph from captured activity without server changes", () => {
    const branchGraph = deriveBranchGraphSnapshot([
      {
        type: "OCR",
        content: { timestamp: "2026-03-06T01:10:00.000Z", app_name: "Cursor" },
      },
      {
        type: "Input",
        content: { timestamp: "2026-03-06T02:35:00.000Z", app_name: "Cursor" },
      },
      {
        type: "Accessibility",
        content: { timestamp: "2026-03-06T03:40:00.000Z", app_name: "Arc" },
      },
    ], new Date("2026-03-06T08:00:00.000Z"));

    expect(branchGraph.mergeStatusLabel).toBe("Live on this device");
    expect(branchGraph.lanes[0]?.label).toBe("This Mac");
    expect(branchGraph.lanes[0]?.buckets).toHaveLength(8);
    expect(branchGraph.lanes[0]?.buckets.some((bucket) => bucket.intensity > 0)).toBe(true);
  });

  it("loads branch graph lanes from the latest daily-review artifact when present", async () => {
    vi.mocked(homeDir).mockResolvedValue("/Users/test");
    vi.mocked(exists).mockImplementation(async (path) => {
      return String(path).includes("state.json") || String(path).includes("daily-review.json") || String(path).endsWith("/output");
    });
    vi.mocked(readDir).mockResolvedValue([{ name: "2026-03-06" }] as never);
    vi.mocked(readTextFile).mockImplementation(async (path) => {
      const target = String(path);
      if (target.endsWith("state.json")) {
        return JSON.stringify({ level: 4, streakDays: 6, cumulativeXp: 240, lastFinalizedDate: "2026-03-06" });
      }

      return JSON.stringify({
        dateKey: "2026-03-06",
        headline: "Founder alpha kept moving",
        narrativeSummary: "Merged the day across devices.",
        branchDigests: [
          {
            deviceId: "mac-local",
            deviceLabel: "This Mac",
            platform: "macos",
            syncFreshness: "live",
            summary: "Cursor, Terminal",
            bucketedActivity: [
              { label: "09:00", activityLevel: 3, topApp: "Cursor" },
              { label: "11:00", activityLevel: 1, topApp: "Terminal", mediaCount: 1 },
            ],
          },
          {
            deviceId: "android-phone",
            deviceLabel: "Phone",
            platform: "android",
            syncFreshness: "17m ago",
            summary: "Messages, camera",
            bucketedActivity: [
              { label: "12:00", activityLevel: 2, topApp: "Camera", mediaCount: 1 },
            ],
          },
        ],
      });
    });

    const artifacts = await loadLatestRewindArtifacts("rewind-daily-review");

    expect(artifacts.review?.headline).toBe("Founder alpha kept moving");
    expect(artifacts.branchGraph?.lanes.map((lane) => lane.label)).toEqual(["This Mac", "Phone"]);
    expect(artifacts.branchGraph?.lanes[1]?.platformLabel).toBe("Android");
  });

  it("turns a workflow plan into a Codex-ready assistant prompt", () => {
    const prompt = buildWorkflowPrompt({
      title: "Automate your founder update",
      summary: "Turn product and communication activity into a repeatable daily update.",
      lane: "personal-ops",
      goal: "Send an end-of-day update to investors and advisors",
      scopeLabel: "Limited to approved folders",
      steps: [
        "Review today’s product and communication activity",
        "Draft a clean end-of-day update from the important signals",
      ],
    });

    expect(prompt).toContain("Automate your founder update");
    expect(prompt).toContain("Send an end-of-day update to investors and advisors");
    expect(prompt).toContain("Limited to approved folders");
    expect(prompt).toContain("Draft a clean end-of-day update from the important signals");
  });
});
