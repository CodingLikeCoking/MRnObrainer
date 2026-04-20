import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardTimelinePage } from "@/components/rewind/dashboard-timeline-page";

const homeSpy = vi.fn();
const timelineSpy = vi.fn();

vi.mock("@/components/rewind/home/rewind-home", () => ({
  RewindHome: (props: { showTimelinePreview?: boolean }) => {
    homeSpy(props);
    return <div data-testid="rewind-home">dashboard content</div>;
  },
}));

vi.mock("@/components/rewind/timeline", () => ({
  __esModule: true,
  default: (props: { embedded?: boolean; interactionMode?: string }) => {
    timelineSpy(props);
    return <div data-testid="timeline">timeline content</div>;
  },
}));

vi.mock("@/lib/hooks/use-platform", () => ({
  usePlatform: () => ({ isMac: true }),
}));

describe("DashboardTimelinePage", () => {
  beforeEach(() => {
    homeSpy.mockClear();
    timelineSpy.mockClear();
    HTMLElement.prototype.scrollTo = vi.fn() as unknown as typeof HTMLElement.prototype.scrollTo;
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("resets the overlay scroll to the top on initial render and only renders the ask view for the home section", () => {
    render(<DashboardTimelinePage activeSection="home" />);

    expect(HTMLElement.prototype.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "auto",
    });
    expect(homeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ showTimelinePreview: false })
    );
    expect(screen.queryByTestId("timeline")).not.toBeInTheDocument();
  });

  it("only enters focus mode while the timeline is hovered and the modifier gesture is held", () => {
    render(<DashboardTimelinePage activeSection="timeline" />);

    const timelineSection = screen.getByText("Timeline").closest("section");
    expect(timelineSection).not.toBeNull();

    fireEvent.keyDown(window, { key: "Meta", metaKey: true, shiftKey: true });
    fireEvent.mouseEnter(timelineSection!);

    expect(screen.getByText("timeline focus")).toBeInTheDocument();
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();

    fireEvent.keyUp(window, { key: "Meta", metaKey: false, shiftKey: false });

    expect(screen.getByText("page scroll")).toBeInTheDocument();
  });
});
