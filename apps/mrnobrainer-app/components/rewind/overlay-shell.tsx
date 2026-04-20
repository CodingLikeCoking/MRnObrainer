"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Brain,
  Bot,
  Clock,
  HardDrive,
  HeartPulse,
  Home,
  Keyboard,
  Mic,
  Minus,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Settings as SettingsIcon,
  Server,
  Video,
  Volume2,
  Workflow,
} from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { useQueryState } from "nuqs";

import { useOverlayData } from "@/app/shortcut-reminder/use-overlay-data";
import { DashboardTimelinePage } from "@/components/rewind/dashboard-timeline-page";
import { HealthPage } from "@/components/rewind/health-page";
import { WorkersPage } from "@/components/rewind/workers-page";
import { AIPresets } from "@/components/settings/ai-presets";
import { ConnectionsSection } from "@/components/settings/connections-section";
import { DiskUsageSection } from "@/components/settings/disk-usage-section";
import GeneralSettings from "@/components/settings/general-settings";
import { PipesSection } from "@/components/settings/pipes-section";
import { RecordingSettings } from "@/components/settings/recording-settings";
import { RewindSection } from "@/components/settings/rewind-section";
import ShortcutSection from "@/components/settings/shortcut-section";
import {
  buildRewindMainSections,
  buildRewindSettingsSections,
} from "@/lib/rewind/home-model";
import { hasTauriRuntime } from "@/lib/runtime-environment";
import { cn } from "@/lib/utils";
import { commands } from "@/lib/utils/tauri";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


type MainSection = "home" | "timeline" | "pipes" | "workers" | "health";
type SettingsModalSection =
  | "rewind"
  | "general"
  | "recording"
  | "ai"
  | "connections"
  | "shortcuts"
  | "disk-usage";

const LEGACY_SECTION_MAP: Record<string, MainSection | SettingsModalSection> = {
  account: "general",
  team: "rewind",
  referral: "rewind",
  "cloud-archive": "recording",
  "cloud-sync": "connections",
  help: "home",
  feedback: "home",
};

const MAIN_SECTIONS: MainSection[] = ["home", "timeline", "pipes", "workers", "health"];
const MODAL_SECTIONS = new Set<string>([
  "rewind",
  "general",
  "recording",
  "ai",
  "connections",
  "shortcuts",
  "disk-usage",
]);

const MAIN_SECTION_ICONS = {
  home: <Bot className="h-4 w-4" />,
  timeline: <Clock className="h-4 w-4" />,
  pipes: <Workflow className="h-4 w-4" />,
  workers: <Server className="h-4 w-4" />,
  health: <HeartPulse className="h-4 w-4" />,
} satisfies Record<MainSection, React.ReactNode>;

const SETTINGS_SECTION_ICONS = {
  rewind: <Home className="h-4 w-4" />,
  general: <SettingsIcon className="h-4 w-4" />,
  recording: <Video className="h-4 w-4" />,
  ai: <Brain className="h-4 w-4" />,
  connections: <Plug className="h-4 w-4" />,
  shortcuts: <Keyboard className="h-4 w-4" />,
  "disk-usage": <HardDrive className="h-4 w-4" />,
} satisfies Record<SettingsModalSection, React.ReactNode>;

function normalizeSection(value: string | null): MainSection | SettingsModalSection {
  const mapped = (value && LEGACY_SECTION_MAP[value]) || value;
  if (mapped && [...MAIN_SECTIONS, ...MODAL_SECTIONS].includes(mapped)) {
    return mapped as MainSection | SettingsModalSection;
  }
  return "home";
}

type OverlayShellProps = {
  defaultSection?: MainSection | SettingsModalSection;
};

export function OverlayShell({
  defaultSection = "home",
}: OverlayShellProps) {
  const [activeSection, setActiveSection] = useQueryState("section", {
    defaultValue: defaultSection,
    parse: normalizeSection,
    serialize: (value) => value,
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [modalSection, setModalSection] = useState<SettingsModalSection>("rewind");
  const overlayData = useOverlayData();
  const mainSections = buildRewindMainSections();
  const settingsModalSections = buildRewindSettingsSections();

  interface RecordingDevice {
    name: string;
    kind: "monitor" | "input" | "output";
    active: boolean;
  }

  const [recordingDevices, setRecordingDevices] = useState<RecordingDevice[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setSidebarCollapsed(true);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((previous) => {
      const next = !previous;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  const hideOverlay = useCallback(() => {
    commands.closeWindow("Main").catch((error) => {
      console.error("failed to hide main overlay:", error);
    });
  }, []);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "b") {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [toggleSidebar]);

  useEffect(() => {
    let cancelled = false;

    const fetchDevices = () => {
      fetch("http://localhost:3030/health")
        .then((response) => (response.ok ? response.json() : null))
        .then((health: { monitors?: string[]; device_status_details?: string } | null) => {
          if (cancelled || !health) return;

          const devices: RecordingDevice[] = [];
          for (const name of health.monitors || []) {
            devices.push({ name, kind: "monitor", active: true });
          }
          if (health.device_status_details) {
            for (const part of health.device_status_details.split(", ")) {
              const match = part.split(": ");
              if (match.length < 2) continue;
              const nameAndType = match[0];
              const active = match[1].startsWith("active");
              const kind = nameAndType.includes("(input)")
                ? "input"
                : nameAndType.includes("(output)")
                  ? "output"
                  : "input";
              const name = nameAndType.replace(/\s*\((input|output)\)\s*/gi, "").trim();
              devices.push({ name, kind, active });
            }
          }
          setRecordingDevices(devices);
        })
        .catch(() => {});
    };

    fetchDevices();
    const interval = window.setInterval(fetchDevices, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!hasTauriRuntime()) return;

    let unlisten: (() => void) | null = null;
    listen("watch_pipe", () => {
      setActiveSection("pipes");
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, [setActiveSection]);

  useEffect(() => {
    if (MODAL_SECTIONS.has(activeSection)) {
      setModalSection(activeSection as SettingsModalSection);
      setSettingsModalOpen(true);
    }
  }, [activeSection]);

  const openModal = useCallback(
    (section: SettingsModalSection) => {
      setModalSection(section);
      setSettingsModalOpen(true);
      setActiveSection(section);
    },
    [setActiveSection]
  );

  const closeModal = useCallback(() => {
    setSettingsModalOpen(false);
    if (MODAL_SECTIONS.has(activeSection)) {
      setActiveSection("home");
    }
  }, [activeSection, setActiveSection]);

  useEffect(() => {
    if (!hasTauriRuntime()) return;

    const unlisten = listen<{ url: string }>("navigate", (event) => {
      const url = new URL(event.payload.url, window.location.origin);
      setActiveSection(normalizeSection(url.searchParams.get("section")));
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setActiveSection]);

  const renderMainSection = () => {
    switch (activeSection) {
      case "home":
      case "timeline":
        return <DashboardTimelinePage activeSection={activeSection} />;
      case "pipes":
        return <PipesSection />;
      case "workers":
        return <WorkersPage />;
      case "health":
        return <HealthPage />;
      default:
        return <DashboardTimelinePage activeSection="home" />;
    }
  };

  const renderModalSection = () => {
    switch (modalSection) {
      case "rewind":
        return <RewindSection />;
      case "general":
        return <GeneralSettings />;
      case "recording":
        return <RecordingSettings />;
      case "ai":
        return <AIPresets />;
      case "connections":
        return <ConnectionsSection />;
      case "shortcuts":
        return <ShortcutSection />;
      case "disk-usage":
      default:
        return <DiskUsageSection />;
    }
  };

  const deviceGroups = useMemo(() => {
    const monitors = recordingDevices.filter((device) => device.kind === "monitor");
    const inputs = recordingDevices.filter((device) => device.kind === "input");
    const outputs = recordingDevices.filter((device) => device.kind === "output");
    const screenOpacity = overlayData.screenActive
      ? 0.5 + Math.min(overlayData.captureFps / 2, 0.5)
      : 0.2;
    const audioOpacity = overlayData.audioActive
      ? 0.5 + Math.min(overlayData.speechRatio, 0.5)
      : 0.2;

    const groups: Array<{
      key: string;
      icon: typeof Monitor;
      count: number;
      title: string;
      opacity: number;
    }> = [];

    if (monitors.length > 0) {
      groups.push({
        key: "monitor",
        icon: Monitor,
        count: monitors.length,
        title: monitors.map((device) => device.name).join(", "),
        opacity: screenOpacity,
      });
    }
    if (inputs.length > 0) {
      groups.push({
        key: "mic",
        icon: Mic,
        count: inputs.length,
        title: inputs.map((device) => device.name).join(", "),
        opacity: audioOpacity,
      });
    }
    if (outputs.length > 0) {
      groups.push({
        key: "output",
        icon: Volume2,
        count: outputs.length,
        title: outputs.map((device) => device.name).join(", "),
        opacity: audioOpacity,
      });
    }

    return groups;
  }, [overlayData.audioActive, overlayData.captureFps, overlayData.screenActive, overlayData.speechRatio, recordingDevices]);

  const isFullHeight = activeSection === "timeline";

  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <div className="h-8 bg-transparent" data-tauri-drag-region></div>

      <div className="px-4">
        <div className="flex h-[calc(100vh-2rem)] min-h-0 min-w-0">
          <TooltipProvider delayDuration={0}>
            <div
              className={cn(
                "flex min-h-0 flex-shrink-0 flex-col overflow-x-hidden overflow-y-auto rounded-tl-lg border-r bg-background transition-all duration-200",
                sidebarCollapsed ? "w-14" : "w-56"
              )}
            >
              <div className={cn("flex items-center overflow-hidden border-b py-3", sidebarCollapsed ? "justify-center px-2" : "justify-between gap-2 px-4")}>
                {!sidebarCollapsed && <h1 className="min-w-0 truncate text-lg font-bold text-foreground">MRnObrainer</h1>}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!sidebarCollapsed &&
                    deviceGroups.map(({ key, icon: Icon, count, title, opacity }) => (
                      <span key={key} className="flex items-center gap-0.5" title={title}>
                        <Icon className="h-3.5 w-3.5 text-foreground transition-opacity duration-500" style={{ opacity }} />
                        {count > 1 && <span className="text-[9px] font-medium leading-none text-foreground/50">{count}</span>}
                      </span>
                    ))}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={hideOverlay}
                        className={cn(
                          "glass-chip inline-flex items-center gap-1.5 rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground",
                          sidebarCollapsed && "h-8 w-8 justify-center px-0"
                        )}
                        aria-label="Hide MRnObrainer overlay"
                      >
                        <Minus className="h-3.5 w-3.5" />
                        {!sidebarCollapsed && <span>Hide</span>}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Hide overlay <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">Esc</kbd>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={toggleSidebar} className="text-muted-foreground transition-colors hover:text-foreground">
                        {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {sidebarCollapsed ? "expand sidebar" : "collapse sidebar"} <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">⌘B</kbd>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="flex flex-1 flex-col overflow-y-auto p-2">
                <div className="space-y-0.5">
                  {mainSections.map((section) => {
                    const isActive = activeSection === section.id && !settingsModalOpen;
                    const button = (
                      <button
                        key={section.id}
                        onClick={() => {
                          setActiveSection(section.id);
                          setSettingsModalOpen(false);
                        }}
                        className={cn(
                          "group flex w-full items-center rounded-lg px-3 py-2 text-left transition-all duration-150",
                          sidebarCollapsed ? "justify-center" : "space-x-2.5",
                          isActive
                            ? "border border-border bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
                        )}
                      >
                        <div className={cn("flex-shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}>
                          {MAIN_SECTION_ICONS[section.id]}
                        </div>
                        {!sidebarCollapsed && <span className="truncate text-sm font-medium">{section.label}</span>}
                      </button>
                    );

                    if (sidebarCollapsed) {
                      return (
                        <Tooltip key={section.id}>
                          <TooltipTrigger asChild>{button}</TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
                            {section.label}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return button;
                  })}
                </div>

                <div className="flex-1" />

                <div className="space-y-0.5 border-t border-border pt-2">
                  {(() => {
                    const button = (
                      <button
                        onClick={() => openModal("rewind")}
                        className={cn(
                          "group flex w-full items-center rounded-lg px-3 py-2 text-left transition-all duration-150",
                          sidebarCollapsed ? "justify-center" : "space-x-2.5",
                          settingsModalOpen
                            ? "border border-border bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
                        )}
                      >
                        <div className={cn("flex-shrink-0 transition-colors", settingsModalOpen ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}>
                          <SettingsIcon className="h-4 w-4" />
                        </div>
                        {!sidebarCollapsed && <span className="truncate text-sm font-medium">Settings</span>}
                      </button>
                    );

                    if (sidebarCollapsed) {
                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>{button}</TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
                            Settings
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return button;
                  })()}
                </div>
              </div>
            </div>
          </TooltipProvider>

          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col rounded-tr-lg bg-background">
            {isFullHeight ? (
              <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{renderMainSection()}</div>
            ) : (
              <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
                <div className="w-full px-4 pb-12 pt-4 sm:px-6 sm:pt-6">{renderMainSection()}</div>
              </div>
            )}

            {settingsModalOpen && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="flex h-[calc(100%-2rem)] w-[960px] max-w-[calc(100%-2rem)] overflow-hidden border border-border bg-background" onClick={(event) => event.stopPropagation()}>
                  <div className="flex w-48 flex-shrink-0 flex-col overflow-y-auto border-r border-border">
                    <div className="space-y-3 p-3">
                      <div>
                        <div className="px-2 pb-1">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Settings</span>
                        </div>
                        <div className="space-y-0.5">
                          {settingsModalSections.map((section) => (
                            <button
                              key={section.id}
                              onClick={() => {
                                setModalSection(section.id);
                                setActiveSection(section.id);
                              }}
                              className={cn(
                                "flex w-full items-center space-x-2 rounded px-2 py-1.5 text-left text-sm transition-all duration-150",
                                modalSection === section.id
                                  ? "border border-border bg-card text-foreground"
                                  : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
                              )}
                            >
                              <div className={cn("flex-shrink-0", modalSection === section.id ? "text-foreground" : "text-muted-foreground")}>{SETTINGS_SECTION_ICONS[section.id]}</div>
                              <span className="truncate">{section.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-shrink-0 items-center border-b border-border px-6 py-3" data-tauri-drag-region>
                      <h2 className="text-sm font-medium text-foreground">{settingsModalSections.find((section) => section.id === modalSection)?.label}</h2>
                      <button
                        onClick={closeModal}
                        className="ml-auto text-xs text-muted-foreground transition-colors hover:text-foreground"
                        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                      >
                        Close
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">{renderModalSection()}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
