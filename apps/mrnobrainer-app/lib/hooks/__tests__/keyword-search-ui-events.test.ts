import { describe, expect, it } from "vitest";

import { mapUiEventSearchResults } from "@/lib/hooks/use-keyword-search-store";

describe("mapUiEventSearchResults", () => {
  it("keeps cross-device identity from input search payloads", () => {
    expect(
      mapUiEventSearchResults({
        data: [
          {
            content: {
              id: 7,
              timestamp: "2026-03-11T12:00:00Z",
              event_type: "notification_received",
              text_content: "Alice replied about the invoice",
              app_name: "Gmail",
              window_title: "Inbox",
              machine_id: "android-pixel-1",
              device_name: "Pixel 9 Pro",
              source_platform: "android",
            },
          },
        ],
      })
    ).toEqual([
      {
        id: 7,
        timestamp: "2026-03-11T12:00:00Z",
        event_type: "notification_received",
        text_content: "Alice replied about the invoice",
        app_name: "Gmail",
        window_title: "Inbox",
        machine_id: "android-pixel-1",
        device_name: "Pixel 9 Pro",
        source_platform: "android",
      },
    ]);
  });
});
