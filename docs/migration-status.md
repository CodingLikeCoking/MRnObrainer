# MRnObrainer migration status

## Current source of truth

- Active clean repo: `/Users/owenwong/Desktop/Codex/MRnObrainer`
- Frozen source repo: `/Users/owenwong/Desktop/Codex/screenpipe-android-oracle`
- Installed validation target: `/Applications/MRnObrainer.app`

## Phase status

### Completed in this migration wave

- Created a clean local git repo on `main`
- Migrated the minimum desktop app shell from the Screenpipe-derived repo
- Migrated the Rust crates required for the current macOS installed app build/runtime chain:
  - `screenpipe-core`
  - `screenpipe-server`
  - `screenpipe-vision`
  - `screenpipe-accessibility`
  - `screenpipe-audio`
  - `screenpipe-db`
  - `screenpipe-integrations`
  - `screenpipe-events`
  - `screenpipe-apple-intelligence` (needed as a declared optional path dependency)
- Preserved signing/updater/branding/install scripts needed by the installed app
- Verified the clean repo can build the web app and the signed Tauri desktop bundle
- Verified the installed app launches and the local capture/timeline health endpoint is healthy
- Removed high-noise build artifact directories from both the source repo and the clean repo
- Reduced duplicate local branch clutter in the source repo

### Explicitly not migrated in this wave

- `packages/*` worker / remote / publish surfaces
- Android / mobile satellite surfaces beyond what is already embedded in copied app code
- Non-essential root docs, plans, audits, and historical Screenpipe repo content
- Extra GitHub workflows beyond the updater publish surface

## Rules for the next migration waves

1. Migrate one product block at a time.
2. After each block, delete unused glue/helpers that did not enter the installed app chain.
3. Every wave must end with fresh verification against `/Applications/MRnObrainer.app`.
4. Do not reintroduce feature-branch-by-default workflow; stay on `main` unless explicitly asked.
5. Public app naming stays driven by `apps/mrnobrainer-app/brand.config.json`; do not change bundle identifier or updater identity during normal renames.

## Next migration wave

- Strip or isolate non-essential surfaces still copied inside `apps/mrnobrainer-app` that are not required for the current installed app's day-to-day shell/capture/timeline/settings path.
- Audit app routes and Tauri commands for features that are present in code but not required by the current product surface.
- Decide whether Ask/assistant stays in the near-term product core or moves to a later migration wave.
