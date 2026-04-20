import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";

import { AccountSection } from "@/components/settings/account-section";
import { BillingSection } from "@/components/settings/billing-section";
import { PRODUCT_SUPPORT_URL } from "@/lib/product-config";

const mocked = vi.hoisted(() => ({
  openUrl: vi.fn(),
  updateSettings: vi.fn(),
  loadUser: vi.fn(),
  settings: {} as Record<string, unknown>,
}));

type SettingsState = {
  user?: {
    id?: string | null;
    email?: string | null;
    token?: string | null;
    cloud_subscribed?: boolean | null;
    stripe_connected?: boolean | null;
  };
  deviceId?: string | null;
  pipeSyncEnabled?: boolean;
};

vi.mock("@/lib/hooks/use-settings", () => ({
  useSettings: () => ({
    settings: mocked.settings,
    updateSettings: mocked.updateSettings,
    loadUser: mocked.loadUser,
  }),
}));

vi.mock("@tauri-apps/plugin-shell", () => ({
  open: mocked.openUrl,
}));

vi.mock("@tauri-apps/plugin-deep-link", () => ({
  onOpenUrl: vi.fn(async () => () => {}),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => {}),
}));

vi.mock("@/lib/utils/tauri", () => ({
  commands: {
    openLoginWindow: vi.fn(),
    piUpdateConfig: vi.fn(),
  },
}));

vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

vi.mock("@/components/settings/pricing-toggle", () => ({
  PricingToggle: () => <div data-testid="pricing-toggle" />,
}));

vi.mock("@/components/settings/referral-card", () => ({
  ReferralCard: () => <div data-testid="referral-card" />,
}));

describe("account and billing hosted-boundary copy", () => {
  beforeEach(() => {
    mocked.settings = {};
    mocked.openUrl.mockReset();
    mocked.updateSettings.mockReset();
    mocked.loadUser.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("uses support-oriented handoff labels in the account section", () => {
    mocked.settings = {
      user: {
        id: "user-1",
        email: "owen@example.com",
        token: "token-1",
        cloud_subscribed: true,
        stripe_connected: true,
      },
      pipeSyncEnabled: false,
    };

    render(<AccountSection />);

    expect(screen.getByRole("button", { name: /^support$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /billing help/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^manage$/i })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^support$/i }));
    expect(mocked.openUrl).toHaveBeenCalledWith(PRODUCT_SUPPORT_URL);
  });

  it("adds an explicit billing help handoff in the billing section", async () => {
    mocked.settings = {
      user: {
        email: "owen@example.com",
        token: "token-1",
        cloud_subscribed: true,
      },
      deviceId: "device-1",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL | Request) => {
        const url = String(input);
        if (url.includes("/v1/usage")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              tier: "pro",
              used_today: 3,
              limit_today: 20,
              remaining: 17,
              resets_at: "2026-04-18T12:00:00.000Z",
              model_access: ["gpt-5"],
              credits_balance: 12.5,
            }),
          } as Response);
        }

        return Promise.resolve({
          ok: true,
          json: async () => ({
            auto_reload: {
              enabled: false,
              threshold: 5,
              amount: 25,
            },
            stripe_customer: {
              last4: "4242",
              brand: "visa",
            },
          }),
        } as Response);
      })
    );

    render(<BillingSection />);

    await waitFor(() => {
      expect(screen.getByText("Need billing help?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /billing help/i }));
    expect(mocked.openUrl).toHaveBeenCalledWith(PRODUCT_SUPPORT_URL);
  });
});
