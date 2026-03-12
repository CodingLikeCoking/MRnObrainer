# MRnObrainer Privacy Surface

MRnObrainer is designed around one default rule: your primary Mac keeps the authoritative context unless you explicitly connect something else.

## What stays local by default

- Screen capture, OCR, audio capture, and local timeline history.
- Search, timeline scrubbing, and the first-pass automation suggestions shown in the app.
- Local settings, shortcuts, and replayable onboarding state.

## What can be hosted

- Release metadata and signed updater feeds for official builds.
- GitHub Releases downloads for manual installs and source-build fallback updates.
- Optional telemetry only when you explicitly configure public telemetry keys for an OSS build, including `NEXT_PUBLIC_POSTHOG_KEY` for the frontend webview or the backend `MRNOBRAINER_*` / `SCREENPIPE_*` telemetry variables.

## What is optional

- Cloud or OAuth-backed model providers.
- OpenClaw, remote Macs, VMs, or VPS workers.
- MCP connectors and external tools that execute outside the Oracle.

## Oracle and Workers

- `This Mac = Oracle`: the main laptop keeps the local memory and remains the source of truth.
- `Other Macs / VMs / OpenClaw hosts = Workers`: they receive context and run longer automations away from the Oracle.

## Permission expectations on macOS

- Installing signed updates in place helps retain permissions more reliably than reinstalling.
- macOS can still re-prompt for screen, audio, accessibility, or automation permissions over time.
- MRnObrainer treats those prompts as a normal recovery path, not as proof that local data moved off-device.
