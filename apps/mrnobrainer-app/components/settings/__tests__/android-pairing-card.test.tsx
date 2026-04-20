import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { AndroidPairingCard } from "@/components/settings/android-pairing-card";

const invokeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="qr-code">{value}</div>
  ),
}));

describe("AndroidPairingCard", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    vi.restoreAllMocks();
  });

  it("loads existing tokens and generates a pairing payload for Android", async () => {
    invokeMock.mockResolvedValue({
      serverUrl: "http://192.168.1.8:3030",
      oracleDeviceId: "macbook-air-oracle",
      oracleDeviceName: "MacBook Air Oracle",
    });

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input.toString();
        if (url.endsWith("/cross-device/tokens") && (!init?.method || init.method === "GET")) {
          return new Response(
            JSON.stringify({
              tokens: [
                {
                  id: 4,
                  label: "Xiaomi 15 Ultra",
                  token_preview: "sp_cd_1234...7890",
                  created_at: "2026-03-11T12:00:00.000Z",
                  revoked_at: null,
                  last_used_at: "2026-03-11T12:05:00.000Z",
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }

        if (url.endsWith("/cross-device/tokens") && init?.method === "POST") {
          return new Response(
            JSON.stringify({
              id: 9,
              label: "Android satellite",
              token: "sp_cd_generated_token",
              token_preview: "sp_cd_gene...oken",
              created_at: "2026-03-11T12:10:00.000Z",
            }),
            { status: 201, headers: { "content-type": "application/json" } },
          );
        }

        throw new Error(`unexpected fetch ${url}`);
      });

    render(<AndroidPairingCard />);

    expect(await screen.findByText("Xiaomi 15 Ultra")).toBeInTheDocument();
    expect(screen.getByText("sp_cd_1234...7890")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /generate pair code/i }));

    const qrCode = await screen.findByTestId("qr-code");
    const payloadText = qrCode.textContent ?? "";
    expect(payloadText).toContain("\"serverUrl\":\"http://192.168.1.8:3030\"");
    expect(payloadText).toContain("\"token\":\"sp_cd_generated_token\"");
    expect(payloadText).toContain("\"oracleDeviceId\":\"macbook-air-oracle\"");
    expect(payloadText).toContain("\"oracleDeviceName\":\"MacBook Air Oracle\"");

    fetchMock.mockRestore();
  });
});
