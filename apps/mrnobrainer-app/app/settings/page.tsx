"use client";

import React, { Suspense } from "react";

import { OverlayShell } from "@/components/rewind/overlay-shell";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-muted-foreground">Loading settings...</div>
        </div>
      }
    >
      <OverlayShell defaultSection="rewind" />
    </Suspense>
  );
}
