---
schedule: "30 13 * * *"
enabled: true
title: Rewind Daily Review
description: "Generate a Rewind-style daily review, RPG summary, and optional Notion publish from Screenpipe data"
icon: "🧭"
allow-content-types:
  - ocr
  - audio
  - input
  - accessibility
allow-raw-sql: false
allow-frames: false
history: false
---

You are running inside the pipe directory. Use the helper scripts in `./scripts` and keep the JSON artifact as the source of truth.
Use `node` when it is available. If `node` is not installed, run the same `.mjs` files with `bun`.

Objectives:
1. Build one truthful daily review for the target date.
2. Assign RPG XP for the day.
3. Write normalized JSON first.
4. Render markdown and update local state.
5. Publish to Notion only when the required secrets exist.

Rules:
- Use only the local Screenpipe API from the context header.
- Query `/search` with `content_type=all` and `content_type=input` only.
- Do not use `/raw_sql`.
- Do not invent meetings, tasks, or accomplishments that are not supported by the evidence.
- If the day is sparse, say that clearly and lower the confidence of the narrative.
- Keep the tone grounded. This is a daily closeout, not a hype summary.

Execution order:
1. Read the `Screenpipe API:` value from the context header and use that exact base URL.
2. Run `node ./scripts/prepare-evidence.mjs --screenpipe-url "<screenpipe-api-from-header>" --date-key "<YYYY-MM-DD>" --timezone "<IANA timezone>" --start-time "<ISO8601>" --end-time "<ISO8601>" --output ./output/<YYYY-MM-DD>/evidence.json` or the same command with `bun`
3. If `.env` exists, load it before any command that references Notion secrets. Example: `set -a; source ./.env; set +a`
4. Read `./output/<YYYY-MM-DD>/evidence.json`.
5. Write `./output/<YYYY-MM-DD>/daily-review.raw.json` with this exact schema:
   - `dateKey`
   - `timezone`
   - `generatedAt`
   - `headline`
   - `oneLiner`
   - `narrativeSummary`
   - `highlights[]`
   - `keyMoments[]` as `{ timestamp, label }`
   - `tasks[]`
   - `meetings[]`
   - `blockers[]`
   - `topApps[]` as `{ appName, minutes }`
   - `focusMinutesEstimate`
   - `sourceStats` as `{ allCount, inputCount, appCount }`
   - `sourceApps[]`
   - `sourceDevices[]`
   - `rpg` as `{ xpEarned, focusXp, deepWorkXp, learningXp, communicationXp, statusLabel, rationale }`
6. Run `node ./scripts/finalize-review.mjs --input ./output/<YYYY-MM-DD>/daily-review.raw.json --output-dir ./output` or the same command with `bun`
7. If `.env` is loaded and contains `NOTION_API_KEY` and `NOTION_DATABASE_ID`, run `node ./scripts/publish-notion.mjs --review ./output/<YYYY-MM-DD>/daily-review.json --manifest ./output/<YYYY-MM-DD>/manifest.json --notion-api-key "$NOTION_API_KEY" --notion-database-id "$NOTION_DATABASE_ID" --user-id "${USER_ID:-local-user}"` or the same command with `bun`

Quality bar for the JSON:
- `headline` should read like the best one-line theme of the day.
- `oneLiner` should be concrete and short.
- `narrativeSummary` should describe the day honestly, including uncertainty.
- `highlights`, `tasks`, `meetings`, and `blockers` should be deduplicated.
- `topApps` should reflect the strongest evidence from the Screenpipe results.
- RPG XP must stay plausible for one day. Keep total `xpEarned` between 0 and 100.

If there is not enough activity to finalize, still create a valid JSON file with empty arrays, `focusMinutesEstimate: 0`, low XP, and a clear explanation in `narrativeSummary` and `rpg.rationale`.
