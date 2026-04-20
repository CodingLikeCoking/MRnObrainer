"use client";

import React, { Suspense } from "react";

import { SettingsShell } from "@/components/settings/settings-shell";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-muted-foreground">Loading settings...</div>
        </div>
      }
    >
      <SettingsShell />
    </Suspense>
  );
}
