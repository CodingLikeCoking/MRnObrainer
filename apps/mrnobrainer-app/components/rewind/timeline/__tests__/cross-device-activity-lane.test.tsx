import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  CrossDeviceActivityLane,
  normalizeCrossDeviceTimelineEvents,
} from "@/components/rewind/timeline/cross-device-activity-lane";

describe("CrossDeviceActivityLane", () => {
  it("renders cross-device events in chronological order with device identity", () => {
    const events = normalizeCrossDeviceTimelineEvents([
      {
        timestamp: "2026-03-06T09:07:00.000Z",
        event_type: "text_shared",
        text: "Drafted the reply on the laptop",
        app_name: "Gmail",
        machine_id: "oracle-mba",
        device_name: "MacBook Air",
        source_platform: "macos",
      },
      {
        timestamp: "2026-03-06T09:00:00.000Z",
        event_type: "notification_received",
        text: "Read customer email on the phone",
        app_name: "Gmail",
        machine_id: "xiaomi15-ultra",
        device_name: "Xiaomi 15 Ultra",
        source_platform: "android",
      },
      {
        timestamp: "2026-03-06T09:07:00.000Z",
        event_type: "text_shared",
        text: "Drafted the reply on the laptop",
        app_name: "Gmail",
        machine_id: "oracle-mba",
        device_name: "MacBook Air",
        source_platform: "macos",
      },
    ]);

    render(<CrossDeviceActivityLane events={events} />);

    const rows = screen.getAllByTestId("cross-device-row");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Xiaomi 15 Ultra")).toBeInTheDocument();
    expect(within(rows[0]).getByText(/notification/i)).toBeInTheDocument();
    expect(within(rows[1]).getByText("MacBook Air")).toBeInTheDocument();
    expect(within(rows[1]).getByText(/shared text/i)).toBeInTheDocument();
    expect(screen.getByText("android")).toBeInTheDocument();
    expect(screen.getByText("macos")).toBeInTheDocument();
  });

  it("returns null when there are no cross-device events to show", () => {
    const { container } = render(<CrossDeviceActivityLane events={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
