import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ClawFleetCard } from "@/components/settings/claw-fleet-card";

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("ClawFleetCard", () => {
  it("renders the fleet roster, guided pairing copy, and local-first warning", () => {
    render(
      <ClawFleetCard
        claws={[
          {
            id: "claw-local",
            hostId: "host-local",
            name: "This Mac",
            title: "Oracle",
            levelLabel: "Lv. 1",
            locationLabel: "Oracle on this Mac",
            modelLabel: "Local model",
            status: "idle",
            currentTask: "Authoritative local context stays here",
            lastHeartbeatLabel: "Just now",
            healthScore: 96,
            executorPreference: ["local-pipe", "local-openclaw", "remote-openclaw", "external-tool"],
            role: "oracle",
          },
          {
            id: "claw-remote",
            hostId: "host-remote",
            name: "Studio Mac mini",
            title: "Worker",
            levelLabel: "Lv. 4",
            locationLabel: "Remote worker via Tailnet",
            modelLabel: "Local model",
            status: "running",
            currentTask: "Running founder update",
            lastHeartbeatLabel: "12s ago",
            healthScore: 98,
            executorPreference: ["remote-openclaw", "local-pipe", "external-tool"],
            role: "worker",
          },
        ]}
        guardrails={{
          preferLocalModels: true,
          oauthWarningDismissed: false,
          allowCloudBypass: true,
          nonTechnicalMode: true,
        }}
        onPersist={vi.fn()}
      />
    );

    expect(screen.getByText("Oracle + Workers")).toBeInTheDocument();
    expect(screen.getByText(/This Mac stays the oracle/i)).toBeInTheDocument();
    expect(screen.getByText("Oracle")).toBeInTheDocument();
    expect(screen.getByText("Worker")).toBeInTheDocument();
    expect(screen.getByText("This Mac")).toBeInTheDocument();
    expect(screen.getByText("Studio Mac mini")).toBeInTheDocument();
    expect(screen.getByText("Cloud/OAuth can expose task context off-device; local models are safer.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add worker/i })).toBeInTheDocument();
  });
});
