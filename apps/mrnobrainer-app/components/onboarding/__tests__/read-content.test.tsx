import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ReadContent from "@/components/onboarding/read-content";

vi.mock("@tauri-apps/plugin-shell", () => ({
  open: vi.fn(),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    minimize: vi.fn(),
    unminimize: vi.fn(),
    setFocus: vi.fn(),
  }),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

describe("ReadContent", () => {
  it("keeps onboarding local and does not send users to the Screenpipe welcome page", () => {
    render(<ReadContent handleNextSlide={() => {}} />);

    expect(screen.queryByText(/screenpi\.pe\/welcome/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /open in browser/i })).not.toBeInTheDocument();
    expect(screen.getByText(/getting your timeline ready/i)).toBeInTheDocument();
    expect(screen.getByText(/we're checking that your recent activity is showing up on this mac/i)).toBeInTheDocument();
  });
});
