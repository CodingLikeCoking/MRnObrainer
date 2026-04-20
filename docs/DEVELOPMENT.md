# MRnObrainer Solo Development Guide

This guide is for one developer working locally, especially when using AI or
vibe-coding loops. The main rule is simple: **run one app mode at a time**.

## Which command should I run?

| Goal | Command | What it starts |
| --- | --- | --- |
| Edit or visually check the web UI only | `bun dev` in `apps/mrnobrainer-app` | Next.js on `localhost:1420` |
| Run the real desktop app | `bun run tauri dev` in `apps/mrnobrainer-app` | Tauri shell, web UI, embedded capture backend, tray, shortcuts |
| Build the stable packaged Mac app | `bun run tauri:build` in `apps/mrnobrainer-app` | `MRnObrainer.app` bundle with stable updater config |
| Build the local dev packaged Mac app | `bun run tauri:build:dev` in `apps/mrnobrainer-app` | `MRnObrainer Dev.app` bundle with dev bundle ID |
| Debug only the Rust backend/API | `cargo run -p screenpipe-server -- record` from repo root | standalone capture API on `localhost:3030` |
| Run frontend/unit tests | `bun run test` in `apps/mrnobrainer-app` | Vitest |
| Run a route smoke test | `bun run browser-smoke` in `apps/mrnobrainer-app` | temporary Next server plus Playwright checks |
| Check Rust server compilation | `cargo check -p screenpipe-server` from repo root | Rust compile check |

## Do not double-launch these

Avoid these combinations:

- Do not run `bun dev` and then `bun run tauri dev`.
  Tauri already runs `bun run dev` through its `beforeDevCommand`.
- Do not run the desktop app and `cargo run -p screenpipe-server -- record`
  at the same time. Both want the local capture API, usually
  `localhost:3030`.
- Do not leave old overnight worktrees on Desktop and edit the wrong copy.
  The canonical local repo should be:

```text
/Users/owenwong/Desktop/screenpipe-android-oracle
```

If Codex or another agent creates worktrees, keep them outside Desktop or archive
them when the run is finished.

## Local setup

```bash
cd /Users/owenwong/Desktop/screenpipe-android-oracle/apps/mrnobrainer-app
bun install
```

Optional safety checks:

```bash
cd /Users/owenwong/Desktop/screenpipe-android-oracle
python3 -m pip install pre-commit detect-secrets
pre-commit install
pre-commit run --all-files
```

## Full desktop development

Use this when you need to test capture, permissions, tray behavior, shortcuts,
the embedded API, or Tauri commands:

```bash
cd /Users/owenwong/Desktop/screenpipe-android-oracle/apps/mrnobrainer-app
bun run tauri dev
```

The live dev shell already uses the dev identifier (`screenpi.pe.dev`). Treat
it as a separate app from the stable packaged install.

## Packaged app split: stable vs dev

Use this split so local coding does not keep disturbing the stable app's macOS
privacy state:

- Stable app: `/Applications/MRnObrainer.app`
- Dev app: `/Applications/MRnObrainer Dev.app`

Build and install them separately:

```bash
cd /Users/owenwong/Desktop/screenpipe-android-oracle/apps/mrnobrainer-app

bun run tauri:build
bun run install:macos

bun run tauri:build:dev
bun run install:macos:dev
```

The dev app uses a separate bundle identifier (`screenpi.pe.dev`) and should
keep its own permissions. That avoids constantly overwriting the stable app you
actually dogfood.

## Apple signing and updates

For the stable app to behave like a normal Mac app with fewer permission
surprises across updates, keep these stable:

1. bundle identifier
2. signing identity
3. update channel

This repo now prefers:

- stable builds: `Developer ID Application`
- dev builds: `Apple Development`

Stable packaged builds also add the `official-build` feature so the stable app
uses the repo-owned in-app updater path by default (served from the
`updater-manifests` branch in `CodingLikeCoking/MRnObrainer`). Use
`MRNOBRAINER_STABLE_UPDATER_URL` / `MRNOBRAINER_BETA_UPDATER_URL` only when you
need to override that default. Optional rollback installs still require
`MRNOBRAINER_ROLLBACK_BASE_URL`. Dev builds intentionally stay off that path.

If no signing identities exist in the keychain, builds still complete but the
result is unsigned/ad-hoc and should not be treated as the long-lived dogfood
install.

### Remaining user-only setup

Xcode account login alone is not enough. The Mac still needs a signing
certificate in Keychain Access. For stable external distribution, the target is
`Developer ID Application`.

Do this in Xcode:

1. Xcode → Settings → Accounts
2. select your Apple Developer team
3. Manage Certificates
4. create or download `Developer ID Application`

Once that identity exists locally, the stable build can be signed consistently
without affecting unrelated apps, as long as you do not revoke other existing
certificates.

Expected local ports:

- `localhost:1420` — Next.js dev UI
- `localhost:3030` — embedded capture/search API started by the desktop app
- `localhost:11435` — local Tauri bridge server

If the app fails to start, check for stuck listeners:

```bash
lsof -nP -iTCP:1420 -sTCP:LISTEN
lsof -nP -iTCP:3030 -sTCP:LISTEN
lsof -nP -iTCP:11435 -sTCP:LISTEN
```

## UI-only development

Use this when you are only editing React components, CSS, copy, or route layout:

```bash
cd /Users/owenwong/Desktop/screenpipe-android-oracle/apps/mrnobrainer-app
bun dev
```

This does **not** prove the full desktop app works. It only proves the web UI
can render through Next.js.

## Backend-only debugging

Use this when you are debugging the standalone Rust API without the Tauri shell:

```bash
cd /Users/owenwong/Desktop/screenpipe-android-oracle
cargo run -p screenpipe-server -- record
```

Stop the desktop app first. The standalone backend and the desktop embedded
backend both use the same Screenpipe/MRnObrainer runtime and should not compete
for the same data directory or port.

## Verification checklist before saying "it works"

Run the smallest set that matches your change:

```bash
cd /Users/owenwong/Desktop/screenpipe-android-oracle/apps/mrnobrainer-app
bun run doctor
bun run test
bun run build
bun run browser-smoke
```

For Rust backend changes:

```bash
cd /Users/owenwong/Desktop/screenpipe-android-oracle
cargo check -p screenpipe-server
```

For high-risk desktop changes, use `TESTING.md`. Windowing, permissions,
capture lifecycle, sync, updater, telemetry, release, and public docs require
explicit validation notes.

## Release and download wording

Use the official MRnObrainer release surface for user-facing install
instructions until a dedicated MRnObrainer-owned hosted download surface is
configured:

```text
https://github.com/CodingLikeCoking/MRnObrainer/releases
```

Once hosted updater URLs are configured, the signed updater can become the
primary install/update path again.

## Design direction

MRnObrainer should follow Apple-inspired Liquid Glass structure without turning
every panel into glass.

- Use glass for control layers: navigation, toolbars, search, filters, compact
  floating actions.
- Keep content calm: timeline rows, logs, settings forms, dense text, and pipe
  execution history need readable surfaces.
- Prefer clear information architecture before visual effects.
- Keep one primary accent and consistent concentric radii.

## Safe vibe-coding loop

1. Start from the canonical repo path.
2. Check `git status --short`.
3. Choose one launch mode.
4. Make a focused change.
5. Run the matching verification command.
6. Record what passed and what was not tested.

Never hide failing checks with `continue-on-error`, and never commit real
captured data, private screenshots, credentials, or unsanitized logs.
