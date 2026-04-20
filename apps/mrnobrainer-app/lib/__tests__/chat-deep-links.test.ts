import { describe, expect, it } from "vitest";

import {
  isChatDeepLink,
  parseChatDeepLinkTarget,
  preserveAllowedChatDeepLinks,
} from "@/lib/chat-deep-links";

describe("chat deep-link helpers", () => {
  it("parses canonical and legacy frame links", () => {
    expect(parseChatDeepLinkTarget("mrnobrainer://frame/123")).toEqual({
      kind: "frame",
      frameId: "123",
    });
    expect(parseChatDeepLinkTarget("screenpipe://frame/456")).toEqual({
      kind: "frame",
      frameId: "456",
    });
  });

  it("parses canonical and legacy timeline links when timestamps are valid", () => {
    expect(
      parseChatDeepLinkTarget(
        "mrnobrainer://timeline?timestamp=2026-04-17T10:00:00Z",
      ),
    ).toEqual({
      kind: "timeline",
      timestamp: "2026-04-17T10:00:00Z",
    });

    expect(
      parseChatDeepLinkTarget(
        "screenpipe://timeline?start_time=2026-04-17T11:00:00Z",
      ),
    ).toEqual({
      kind: "timeline",
      timestamp: "2026-04-17T11:00:00Z",
    });
  });

  it("rejects malformed deep links and preserves safe external urls", () => {
    expect(isChatDeepLink("https://example.com")).toBe(false);
    expect(isChatDeepLink("mrnobrainer://timeline?timestamp=not-a-date")).toBe(false);
    expect(preserveAllowedChatDeepLinks("mrnobrainer://frame/123")).toBe(
      "mrnobrainer://frame/123",
    );
    expect(preserveAllowedChatDeepLinks("https://example.com")).toBe(
      "https://example.com",
    );
    expect(preserveAllowedChatDeepLinks("javascript:alert(1)")).toBe("");
  });
});
