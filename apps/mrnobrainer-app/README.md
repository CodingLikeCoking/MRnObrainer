## MRnObrainer desktop app

This is the Tauri desktop app that powers the MRnObrainer overlay, timeline,
onboarding, local capture backend, and release bundle.

- End-user install: use the [official release page](https://github.com/CodingLikeCoking/MRnObrainer/releases)
- Main product overview and non-technical setup: see the [repo README](../../README.md)
- UI-only development:

```bash
cd apps/mrnobrainer-app
bun install
bun dev
```

`bun dev` only starts the Next.js UI on `localhost:1420`. It does not start the
Tauri shell, tray, global shortcuts, permission flow, or embedded capture API.

For full desktop development, run:

```bash
cd apps/mrnobrainer-app
bun run tauri dev
```

`bun run tauri dev` uses the dev bundle identifier (`screenpi.pe.dev`). The
local packaged dev app should be treated as a separate app from the stable
`MRnObrainer.app`, so it can keep its own permissions and not disturb the
stable dogfood install.

## Stable vs dev Mac app builds

Use these only when you need a packaged `.app` bundle:

```bash
cd apps/mrnobrainer-app
bun run tauri:build        # stable bundle: MRnObrainer.app
bun run install:macos      # installs /Applications/MRnObrainer.app

bun run tauri:build:dev    # dev bundle: MRnObrainer Dev.app
bun run install:macos:dev  # installs /Applications/MRnObrainer Dev.app
```

The stable app is the one intended to use signed updates. The dev app exists so
source builds do not overwrite the stable install or force repeated permission
re-prompts while you are iterating locally.

Stable packaged builds also enable the `official-build` feature so the app uses
the repo-owned signed updater path by default (the `updater-manifests` branch
in `CodingLikeCoking/MRnObrainer`). `MRNOBRAINER_STABLE_UPDATER_URL` /
`MRNOBRAINER_BETA_UPDATER_URL` are now **override hooks**, not required setup.
Optional rollback installs still require `MRNOBRAINER_ROLLBACK_BASE_URL`. Dev
builds intentionally stay on the source-build path and do not opt into the
stable updater.

Do not run `bun dev` separately before `bun run tauri dev`; Tauri already runs
the web dev server through `beforeDevCommand`. Also do not run standalone
`screenpipe-server record` while the desktop app is running, because both want
the local capture/search API port.

For the single-developer workflow, see
[docs/DEVELOPMENT.md](../../docs/DEVELOPMENT.md).

If you are helping a non-technical friend test the desktop build, send them to
the hosted download page in the repo root `README.md` rather than asking them to
run Bun or Cargo locally.
