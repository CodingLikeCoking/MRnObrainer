# MRnObrainer Privacy Surface

MRnObrainer is designed around one default rule: your primary Mac keeps the authoritative context unless you explicitly connect something else.

## What stays local by default

- Screen capture, OCR, audio capture, and local timeline history.
- Search, timeline scrubbing, and the first-pass automation suggestions shown in the app.
- Local settings, shortcuts, and replayable onboarding state.

## What can be hosted

- Release metadata and signed updater feeds for official builds.
- Manual download page bundles for manual installs and source-build fallback updates.
- Optional telemetry only when you explicitly configure public telemetry keys for an OSS build, including `NEXT_PUBLIC_POSTHOG_KEY` for the frontend webview or the backend `MRNOBRAINER_*` / `SCREENPIPE_*` telemetry variables.

## Hosted release boundary for official desktop builds

The current official desktop release surface is intentionally small:

- Signed in-app updates default to the repo-owned updater manifests at `raw.githubusercontent.com/CodingLikeCoking/MRnObrainer/updater-manifests/...`.
- `MRNOBRAINER_STABLE_UPDATER_URL` / `MRNOBRAINER_BETA_UPDATER_URL` are optional override hooks for alternate hosted updater metadata.
- `MRNOBRAINER_ROLLBACK_BASE_URL` is optional and only used when a maintainer intentionally triggers rollback to an older signed build.
- Manual downloads fall back to the project release surface when no hosted updater URL is configured.
- Release artifacts and signatures should stay behind the MRnObrainer-owned hosted boundary; GitHub Releases is a maintainer-facing release record, not the primary install instruction for non-technical users.

Those hosted endpoints should only carry release metadata, signed artifacts, and download routing. They are not the default storage location for captured history, timeline search, or first-pass local automation planning.

Official desktop builds keep hosted deep-link handling narrow as well: hosted callbacks should be limited to sign-in and purchase-completion routes, while onboarding, settings, changelog, and status views stay app-local behind the `mrnobrainer://` scheme.

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
