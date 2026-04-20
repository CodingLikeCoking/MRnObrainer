import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReactMarkdown from "react-markdown";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChatMessage } from "@/components/rewind/chat-message";

const { mockShowWindow, mockEmit, mockSetPendingNavigation, mockToast } = vi.hoisted(() => ({
  mockShowWindow: vi.fn().mockResolvedValue(undefined),
  mockEmit: vi.fn().mockResolvedValue(undefined),
  mockSetPendingNavigation: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  emit: mockEmit,
}));

vi.mock("@/lib/utils/tauri", () => ({
  commands: {
    showWindow: mockShowWindow,
  },
}));

vi.mock("@/lib/hooks/use-timeline-store", () => ({
  useTimelineStore: (selector: (state: { setPendingNavigation: typeof mockSetPendingNavigation }) => unknown) =>
    selector({ setPendingNavigation: mockSetPendingNavigation }),
}));

vi.mock("@/lib/hooks/use-settings", () => ({
  useSettings: () => ({
    settings: {
      aiPresets: [{ defaultPreset: true, model: "gpt-5" }],
    },
  }),
}));

vi.mock("@/components/markdown", () => ({
  MemoizedReactMarkdown: ({ children, ...props }: React.ComponentProps<typeof ReactMarkdown>) => (
    <ReactMarkdown {...props}>{children}</ReactMarkdown>
  ),
}));

vi.mock("@/components/rewind/ui/icons", () => ({
  IconOpenAI: () => <span>openai</span>,
  IconUser: () => <span>user</span>,
  IconClaude: () => <span>claude</span>,
  IconGemini: () => <span>gemini</span>,
}));

vi.mock("@/components/rewind/chat-message-actions", () => ({
  ChatMessageActions: () => null,
}));

vi.mock("@/components/rewind/video", () => ({
  VideoComponent: ({ filePath }: { filePath: string }) => <div>video:{filePath}</div>,
}));

vi.mock("@/components/rewind/mermaid-diagram", () => ({
  MermaidDiagram: ({ chart }: { chart: string }) => <div>mermaid:{chart}</div>,
}));

vi.mock("@/components/ui/codeblock", () => ({
  CodeBlock: ({ children }: { children: React.ReactNode }) => <pre>{children}</pre>,
}));

vi.mock("@/components/ui/use-toast", () => ({
  toast: mockToast,
}));

describe("ChatMessage deep-link handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens canonical mrnobrainer timeline and frame links in-app", async () => {
    render(
      <ChatMessage
        message={{
          id: "assistant-1",
          role: "assistant",
          content:
            "[frame](mrnobrainer://frame/123) and [timeline](mrnobrainer://timeline?timestamp=2026-04-17T10:00:00Z)",
        } as any}
      />,
    );

    fireEvent.click(screen.getByText("frame"));

    await waitFor(() => {
      expect(mockSetPendingNavigation).toHaveBeenCalledWith({
        timestamp: "",
        frameId: "123",
      });
    });

    expect(mockShowWindow).toHaveBeenCalledWith("Main");
    expect(mockEmit).toHaveBeenCalledWith("navigate-to-frame", "123");

    fireEvent.click(screen.getByText("timeline"));

    await waitFor(() => {
      expect(mockSetPendingNavigation).toHaveBeenCalledWith({
        timestamp: "2026-04-17T10:00:00Z",
      });
    });

    expect(mockEmit).toHaveBeenCalledWith(
      "navigate-to-timestamp",
      "2026-04-17T10:00:00Z",
    );
  });

  it("still accepts legacy screenpipe frame links while compatibility remains", async () => {
    render(
      <ChatMessage
        message={{
          id: "assistant-2",
          role: "assistant",
          content: "[legacy frame](screenpipe://frame/456)",
        } as any}
      />,
    );

    fireEvent.click(screen.getByText("legacy frame"));

    await waitFor(() => {
      expect(mockSetPendingNavigation).toHaveBeenCalledWith({
        timestamp: "",
        frameId: "456",
      });
    });

    expect(mockEmit).toHaveBeenCalledWith("navigate-to-frame", "456");
  });
});
