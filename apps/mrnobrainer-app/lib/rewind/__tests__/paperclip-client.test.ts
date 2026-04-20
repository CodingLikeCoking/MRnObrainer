import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildPaperclipOfficeSnapshot,
  normalizePaperclipBaseUrl,
  PaperclipClient,
  paperclipApiUrl,
} from "@/lib/rewind/paperclip-client";

const config = {
  baseUrl: "http://localhost:3100",
  apiToken: "paperclip-token",
  activeCompanyId: "company-1",
  activeCompanyName: "Paperclip Works",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("paperclip client", () => {
  it("normalizes the base url and api path", () => {
    expect(normalizePaperclipBaseUrl("http://localhost:3100/api/")).toBe("http://localhost:3100");
    expect(paperclipApiUrl("http://localhost:3100/", "/companies/company-1/dashboard")).toBe(
      "http://localhost:3100/api/companies/company-1/dashboard"
    );
  });

  it("maps mixed paperclip payloads into an office snapshot", () => {
    const snapshot = buildPaperclipOfficeSnapshot({
      config,
      dashboard: {
        agentCounts: { active: 2, idle: 1, running: 1, paused: 0 },
        taskCounts: { backlog: 3, in_progress: 1 },
        costSummary: { currentMonthUsd: 12.4, budgetUsd: 200 },
      },
      agents: [
        {
          id: "agent-2",
          name: "This Mac",
          title: "Home Claw",
          role: "engineer",
          status: "paused",
          adapterType: "codex_local",
          budgetMonthlyCents: 5000,
          spentMonthlyCents: 250,
        },
        {
          id: "agent-1",
          name: "Office Mini",
          title: "Remote Claw",
          role: "engineer",
          status: "running",
          adapterType: "openclaw_gateway",
          budgetMonthlyCents: 10000,
          spentMonthlyCents: 1600,
          lastHeartbeatAt: new Date(Date.now() - 10_000).toISOString(),
        },
      ],
      org: {
        nodes: [
          { agentId: "agent-1", managerAgentId: "agent-2" },
          { agentId: "agent-2" },
        ],
      },
      runs: [
        {
          id: "run-1",
          status: "running",
          invocationSource: "assignment",
          triggerDetail: "manual",
          startedAt: new Date().toISOString(),
          finishedAt: null,
          createdAt: new Date().toISOString(),
          agentId: "agent-1",
          agentName: "Office Mini",
          adapterType: "openclaw_gateway",
          issueId: "issue-1",
        },
      ],
      issues: [
        {
          id: "issue-1",
          identifier: "ENG-1",
          title: "Digesting founder update",
          status: "in_progress",
          priority: "high",
          description: "Keep the update moving.",
          assigneeAgentId: "agent-1",
          assigneeName: "Office Mini",
        },
      ],
      approvals: [
        {
          id: "approval-1",
          type: "hire_agent",
          status: "pending",
          requestedByAgentName: "Office Mini",
        },
      ],
    });

    expect(snapshot.company.name).toBe("Paperclip Works");
    expect(snapshot.company.runningAgents).toBe(1);
    expect(snapshot.agents[0]?.locationLabel).toBe("Remote worker gateway");
    expect(snapshot.agents[1]?.status).toBe("paused");
    expect(snapshot.agents[0]?.reportsTo).toBe("agent-2");
    expect(snapshot.tasks[0]?.identifier).toBe("ENG-1");
    expect(snapshot.approvals[0]?.type).toBe("hire_agent");
  });

  it("sends bearer auth on write actions", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new PaperclipClient(config);
    await client.pauseAgent("agent-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3100/api/agents/agent-1/pause",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer paperclip-token",
        }),
      })
    );
  });

  it("builds partial snapshots even when some endpoints fail", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ agentCounts: { active: 1 } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      });
    vi.stubGlobal("fetch", fetchMock);

    const client = new PaperclipClient(config);
    const snapshot = await client.fetchOfficeSnapshot();

    expect(snapshot.company.activeAgents).toBe(1);
    expect(snapshot.admin.mode).toBe("error");
    expect(snapshot.admin.errorMessage).toContain("Unauthorized");
  });

  it("throws when all critical office endpoints fail", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new PaperclipClient(config);

    await expect(client.fetchOfficeSnapshot()).rejects.toThrow("Unauthorized");
  });
});
