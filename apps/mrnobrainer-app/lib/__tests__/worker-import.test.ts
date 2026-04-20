import { describe, expect, it } from "vitest";

import {
  buildWorkerImportCandidates,
  createWorkerNode,
  generateWorkerPairingSteps,
  type LegacyOpenClawConfig,
} from "@/lib/worker-import";

describe("worker-import helpers", () => {
  it("merges discovered hosts with legacy OpenClaw sync config", () => {
    const legacy: LegacyOpenClawConfig = {
      host: "oracle-mini.tailnet.ts.net",
      port: "22",
      user: "owen",
      keyPath: "~/.ssh/id_ed25519",
      remotePath: "~/screenpipe-data",
      intervalMinutes: 5,
      enabled: true,
    };

    const candidates = buildWorkerImportCandidates({
      discoveredHosts: [
        {
          host: "oracle-mini.tailnet.ts.net",
          port: 22,
          user: "owen",
          key_path: "~/.ssh/id_ed25519",
          source: "tailscale",
        },
        {
          host: "nightly-mac.local",
          port: 2222,
          user: "agent",
          key_path: "~/.ssh/id_rsa",
          source: "ssh-config",
        },
      ],
      legacyConfig: legacy,
    });

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      host: "oracle-mini.tailnet.ts.net",
      authMode: "ssh-key",
      importSource: "openclaw-sync-config",
      locality: "remote",
    });
    expect(candidates[1]?.importSource).toBe("ssh-discovery");
  });

  it("creates a worker node with Oracle/Worker framing", () => {
    const worker = createWorkerNode({
      host: "nightly-mac.local",
      user: "agent",
      port: 2222,
      keyPath: "~/.ssh/id_rsa",
      importSource: "ssh-discovery",
      alias: "Nightly Mac mini",
    });

    expect(worker.role).toBe("worker");
    expect(worker.name).toBe("Nightly Mac mini");
    expect(worker.locationLabel).toMatch(/worker/i);
    expect(worker.executorPreference[0]).toBe("remote-openclaw");
  });

  it("generates copyable pairing steps without mutating the remote host", () => {
    const steps = generateWorkerPairingSteps({
      host: "oracle-mini.tailnet.ts.net",
      user: "owen",
      keyPath: "~/.ssh/id_ed25519",
      remotePath: "~/screenpipe-data",
    });

    expect(steps[0]).toMatch(/ssh/i);
    expect(steps.join("\n")).toMatch(/screenpipe\/sync/i);
    expect(steps.join("\n")).toMatch(/screenpipe\/skills/i);
  });
});
