# MRnObrainer Performance Envelope

This note is the public operating envelope for the current macOS-first MRnObrainer release.

## What ships by default

- macOS capture defaults to `0.5` FPS in the desktop app.
- The hot frame cache defaults to `3 GB` with `3` days of retention.
- Cloud archive defaults to `7` days of local retention before cleanup is eligible.
- The server resource monitor already samples CPU and memory every `30` seconds and can write JSON logs when `SAVE_RESOURCE_USAGE=1` is set.

Source of truth:

- `apps/mrnobrainer-app/lib/hooks/use-settings.tsx`
- `crates/screenpipe-server/src/video_cache.rs`
- `crates/screenpipe-server/src/archive.rs`
- `crates/screenpipe-server/src/resource_monitor.rs`

## Current benchmark note

The repo already contains one published baseline from the historical Screenpipe FAQ:

- `~600 MB RAM`
- `~10% CPU`
- `~30 GB/month storage at 1 FPS`

That baseline lives in `docs/mintlify/docs-mintlify-mig-tmp/faq.mdx`.

MRnObrainer currently ships the more conservative `0.5` FPS default on macOS, so the practical planning envelope for a normal 8-hour workday is:

- `~300-600 MB RAM`
- `single-digit to low-teens CPU`
- `~0.5-0.7 GB per 8-hour workday`
- `~15 GB per 30-day month` before archive cleanup and user-specific filters

The storage estimate is an inference from the existing `1 FPS` published baseline and the current `0.5 FPS` runtime default. Actual usage varies with monitor count, video quality, OCR/audio settings, and how much the screen changes during the day.

## What users can verify in-product

- The desktop app exposes live disk usage in Settings.
- The Trust Center points users to local-first behavior and remote-provider disclosure.
- The daily review card now shows automation health, queue state, and last run status.

## Release-proof checklist

Before a public release, collect one fresh sample run and keep the evidence with the release notes:

1. Launch the app with `SAVE_RESOURCE_USAGE=1`.
2. Let it run through a representative 8-hour workday.
3. Save the generated `resource_usage_*.json`.
4. Capture the in-app Disk Usage reading at the end of the run.
5. Note monitor count, video quality, OCR setting, and whether remote providers were enabled.

If the fresh sample materially exceeds the envelope above, update this document before shipping.
