"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import { RewindHome } from "@/components/rewind/home/rewind-home";
import Timeline, { type TimelineInteractionMode } from "@/components/rewind/timeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlatform } from "@/lib/hooks/use-platform";
import { cn } from "@/lib/utils";
import { ArrowDown, Command, Grip, ScrollText } from "lucide-react";

type DashboardTimelinePageProps = {
  activeSection: "home" | "timeline";
};

export function DashboardTimelinePage({
  activeSection,
}: DashboardTimelinePageProps) {
  const { isMac } = usePlatform();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const contentSectionRef = useRef<HTMLDivElement | null>(null);
  const hasAnchoredInitialSectionRef = useRef(false);
  const [timelineHovered, setTimelineHovered] = useState(false);
  const [modifierHeld, setModifierHeld] = useState(false);

  const interactionMode: TimelineInteractionMode =
    modifierHeld && timelineHovered ? "focus" : "page";

  const focusHint = useMemo(
    () =>
      isMac
        ? "Hold Command + Shift and scroll here to focus the timeline."
        : "Hold Ctrl + Shift and scroll here to focus the timeline.",
    [isMac]
  );

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const targetSection = contentSectionRef.current;

    if (!scrollContainer || !targetSection) return;

    if (!hasAnchoredInitialSectionRef.current) {
      hasAnchoredInitialSectionRef.current = true;
      if (activeSection === "home") {
        scrollContainer.scrollTo({ top: 0, behavior: "auto" });
        return;
      }
    }

    const top = Math.max(targetSection.offsetTop - 8, 0);
    scrollContainer.scrollTo({ top, behavior: "smooth" });
  }, [activeSection]);

  useEffect(() => {
    const handleKeyChange = (event: KeyboardEvent) => {
      const nextModifierState =
        event.shiftKey && (event.metaKey || event.ctrlKey);
      setModifierHeld(nextModifierState);
    };

    const resetModifier = () => setModifierHeld(false);

    window.addEventListener("keydown", handleKeyChange);
    window.addEventListener("keyup", handleKeyChange);
    window.addEventListener("blur", resetModifier);

    return () => {
      window.removeEventListener("keydown", handleKeyChange);
      window.removeEventListener("keyup", handleKeyChange);
      window.removeEventListener("blur", resetModifier);
    };
  }, []);

  return (
    <div
      ref={scrollContainerRef}
      className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto scrollbar-hide"
    >
      <div className="mx-auto flex min-w-0 w-full max-w-6xl flex-col gap-5 px-4 pb-8 pt-2 sm:gap-6">
        {activeSection === "home" ? (
          <div ref={contentSectionRef}>
            <RewindHome showTimelinePreview activeSection={activeSection} />
          </div>
        ) : (
          <section
            ref={contentSectionRef}
            onMouseEnter={() => setTimelineHovered(true)}
            onMouseLeave={() => setTimelineHovered(false)}
            className="space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/60 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
                <Grip className="h-3.5 w-3.5" />
                Timeline window
              </div>
              <Badge
                variant="outline"
                className="max-w-full rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.15em]"
              >
                {interactionMode === "focus" ? "timeline focus" : "page scroll"}
              </Badge>
            </div>

            <Card className="overflow-hidden border-border/60 bg-background/95">
              <CardHeader className="space-y-3 border-b border-border/60">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ScrollText className="h-4 w-4" />
                      Timeline
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Passive capture and recall stay searchable without sharing the screen with a
                      dense dashboard.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <ArrowDown className="h-3.5 w-3.5" />
                    Scroll to inspect the day.
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge
                    variant="secondary"
                    className="max-w-full whitespace-normal rounded-full px-3 py-1 text-left text-xs leading-relaxed"
                  >
                    {focusHint}
                  </Badge>
                  {isMac ? (
                    <Badge
                      variant="outline"
                      className="max-w-full whitespace-normal rounded-full px-3 py-1 text-left text-xs leading-relaxed"
                    >
                      <Command className="mr-1 h-3 w-3" />
                      Release keys to restore widgets
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="max-w-full whitespace-normal rounded-full px-3 py-1 text-left text-xs leading-relaxed"
                    >
                      Release keys to restore widgets
                    </Badge>
                  )}
                </div>

                <div
                  className={cn(
                    "h-[min(78vh,760px)] min-h-[520px] w-full overflow-hidden rounded-3xl border border-border/60 bg-background transition-all duration-300 sm:min-h-[560px]",
                    interactionMode === "focus"
                      ? "shadow-[0_18px_70px_rgba(0,0,0,0.22)]"
                      : ""
                  )}
                >
                  <Timeline embedded interactionMode={interactionMode} />
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
