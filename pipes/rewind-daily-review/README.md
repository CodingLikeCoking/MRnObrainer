# Rewind Daily Review Pipe

This pipe layers the Rewind daily-closeout workflow on top of stock Screenpipe.

It keeps the Screenpipe runtime intact and adds one focused workflow:
- gather a day's evidence from `GET /search`
- ask the pipe agent to write a Rewind review JSON file
- normalize the review into stable local artifacts
- maintain local RPG state across days
- optionally publish the result to Notion

## Bundle layout

- `pipe.md`: prompt and permissions for the Screenpipe agent
- `.env.example`: optional Notion configuration
- `scripts/prepare-evidence.mjs`: queries Screenpipe and writes evidence JSON
- `scripts/finalize-review.mjs`: validates review JSON, renders markdown, updates `output/state.json`, and writes `manifest.json`
- `scripts/publish-notion.mjs`: creates or updates a Notion page from the finalized review
- `examples/`: example output artifacts
- `output/state.json`: local cumulative RPG state

The helper scripts are written to run under either `node` or `bun`.

`prepare-evidence.mjs` now derives a cross-device evidence lane from the raw search results:
- `sourceDevices[]`: distinct device labels seen in the day's activity
- `crossDeviceTimeline[]`: deduped device-tagged activity rows for the recap agent
- `crossDeviceHandoffs[]`: likely phone-to-desktop or device-to-device transitions inferred from adjacent activity

## Install

From a running Screenpipe instance:

```bash
curl -X POST http://localhost:3030/pipes/install \
  -H "Content-Type: application/json" \
  -d '{"source":"/absolute/path/to/rewind-daily-review"}'
```

Or copy the directory into `~/.screenpipe/pipes/rewind-daily-review` and install it from the Screenpipe app.

## Run manually

1. Copy `.env.example` to `.env` if you want Notion publishing.
2. Install the pipe.
3. Use the Screenpipe app or `POST /pipes/rewind-daily-review/run`.
4. The agent will write artifacts under `./output/<dateKey>/`.

When publishing to Notion from a shell, load the pipe-local `.env` first:

```bash
set -a
source ./.env
set +a
```

## Artifact contract

The finalized day lives under `output/<dateKey>/`:

- `daily-review.json`: canonical structured output
- `daily-review.md`: rendered closeout markdown
- `manifest.json`: artifact paths and Notion publish metadata

Cross-day state lives in `output/state.json`.

## JSON schema

`daily-review.json` includes:

- `dateKey`, `timezone`, `generatedAt`
- `headline`, `oneLiner`, `narrativeSummary`
- `highlights[]`, `keyMoments[]`, `tasks[]`, `meetings[]`, `blockers[]`
- `topApps[]`, `focusMinutesEstimate`, `sourceStats`, `sourceApps[]`, `sourceDevices[]`
- `rpg` with `xpEarned`, `focusXp`, `deepWorkXp`, `learningXp`, `communicationXp`, `statusLabel`, `rationale`, `level`, `streakDays`

## State model

The AI assigns only the per-day RPG values. Local state stays deterministic:

- `xpEarned` and the four XP buckets come from the review JSON
- `output/state.json` tracks all finalized days
- `level` is computed from cumulative XP using `floor(cumulativeXp / 100) + 1`
- `streakDays` is recomputed from the contiguous run of finalized dates

This keeps reruns coherent instead of letting the model drift over time.

## Notion mapping

The Notion publisher uses the same core property vocabulary as the existing Rewind repo:

- `Digest Key`
- `Date`
- `Summary`
- `Focus Minutes`
- `Top Apps`
- `XP Earned`
- `Level`
- `Streak`
- `Status`
- `Source Devices`

When a `manifest.json` already contains a Notion page id, reruns update that page instead of creating duplicates.

## Example

See [examples/daily-review.json](./examples/daily-review.json) and [examples/daily-review.md](./examples/daily-review.md).
