import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AndroidSatelliteScreen } from "@/components/mobile/android-satellite-screen";

const invokeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

describe("AndroidSatelliteScreen", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("loads mobile state and lets the user pair an oracle plus enable live memory", async () => {
    invokeMock.mockImplementation(async (command: string, payload?: Record<string, unknown>) => {
      if (command === "get_pairing_state") {
        return {
          paired: false,
          oracleDeviceName: null,
          serverUrl: null,
          liveCaptureEnabled: false,
          lastSyncAt: null,
        };
      }

      if (command === "get_permission_status") {
        return {
          notificationAccess: false,
          usageAccess: false,
          backgroundSyncReady: true,
        };
      }

      if (command === "list_recent_events") {
        return [
          {
            eventId: "evt-1",
            kind: "user_note_created",
            title: "Inbox handoff",
            detail: "Captured a manual note on the phone.",
            occurredAt: "2026-03-12T09:14:00.000Z",
          },
        ];
      }

      if (command === "pair_oracle") {
        expect(payload).toEqual({
          pairingPayload: "{\"serverUrl\":\"http://192.168.1.8:3030\",\"token\":\"sp_cd_token\"}",
        });

        return {
          paired: true,
          oracleDeviceName: "MacBook Air Oracle",
          serverUrl: "http://192.168.1.8:3030",
          liveCaptureEnabled: false,
          lastSyncAt: "2026-03-12T09:15:00.000Z",
        };
      }

      if (command === "set_live_capture_enabled") {
        expect(payload).toEqual({ enabled: true });
        return {
          paired: true,
          oracleDeviceName: "MacBook Air Oracle",
          serverUrl: "http://192.168.1.8:3030",
          liveCaptureEnabled: true,
          lastSyncAt: "2026-03-12T09:15:00.000Z",
        };
      }

      if (command === "sync_now") {
        return {
          ok: true,
          syncedCount: 1,
          lastSyncAt: "2026-03-12T09:16:00.000Z",
        };
      }

      if (command === "create_user_note") {
        expect(payload).toEqual({ text: "reply from desktop after triage" });
        return [
          {
            eventId: "evt-note-2",
            kind: "user_note_created",
            title: "Manual note captured",
            detail: "reply from desktop after triage",
            occurredAt: "2026-03-12T09:17:00.000Z",
          },
          {
            eventId: "evt-1",
            kind: "user_note_created",
            title: "Inbox handoff",
            detail: "Captured a manual note on the phone.",
            occurredAt: "2026-03-12T09:14:00.000Z",
          },
        ];
      }

      throw new Error(`unexpected command ${command}`);
    });

    render(<AndroidSatelliteScreen />);

    expect(await screen.findByText("not paired")).toBeInTheDocument();
    expect(screen.getByText("Inbox handoff")).toBeInTheDocument();
    expect(screen.getByText("notification access")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("oracle pair payload"), {
      target: {
        value: "{\"serverUrl\":\"http://192.168.1.8:3030\",\"token\":\"sp_cd_token\"}",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /pair android device/i }));

    expect(await screen.findByText("MacBook Air Oracle")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /enable live device memory/i }));

    await waitFor(() => {
      expect(screen.getAllByText("live memory on")).toHaveLength(2);
    });

    fireEvent.click(screen.getByRole("button", { name: /sync now/i }));

    await waitFor(() => {
      expect(screen.getByText(/synced 1 event/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/quick note/i), {
      target: {
        value: "reply from desktop after triage",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /save quick note/i }));

    await waitFor(() => {
      expect(screen.getByText("Manual note captured")).toBeInTheDocument();
      expect(screen.getByText("reply from desktop after triage")).toBeInTheDocument();
    });
  });
});
