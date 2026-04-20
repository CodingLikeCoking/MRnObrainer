# MRnObrainer Support Matrix

This phase is macOS-first. Other platforms remain build targets, but they are not the primary release-quality bar for onboarding, updater behavior, or local capture ergonomics.

| Area | macOS | Windows | Linux |
| --- | --- | --- | --- |
| Official desktop release focus | Primary | Secondary | Secondary |
| Signed in-app updater | Primary path for official builds when MRnObrainer updater URLs are configured | Release artifacts exist, but updater polish is less emphasized | Release artifacts exist, but updater polish is less emphasized |
| First-run onboarding quality bar | Primary | Functional, not launch-defining | Functional, not launch-defining |
| Screen + audio capture quality bar | Primary | Supported | Supported |
| OpenClaw worker import UI | Primary | Available where the desktop app runs | Available where the desktop app runs |
| Source build update path | Manual via the project release surface | Manual via the project release surface | Manual via the project release surface |

## Worker roles

| Device role | Recommended platform | Notes |
| --- | --- | --- |
| Oracle | macOS laptop or desktop | Best supported first-run and local capture experience |
| Worker | macOS mini, VM, VPS, or imported OpenClaw host | Used for remote automations and background execution |

## Build channels

| Channel | Intended audience | Update path |
| --- | --- | --- |
| Stable | Most users | Signed in-app updates from the configured hosted stable feed |
| Beta | Testers and fast adopters | Signed in-app updates from the configured hosted beta feed |
| Source/dev | Contributors | Manual updates via the project release surface |

## Hosted boundary notes

- Official updater metadata now defaults to the repo-owned `updater-manifests` branch and can be overridden with `MRNOBRAINER_STABLE_UPDATER_URL` / `MRNOBRAINER_BETA_UPDATER_URL`.
- Optional rollback installs now depend on `MRNOBRAINER_ROLLBACK_BASE_URL` instead of a hardcoded legacy host.
- Manual install and fallback update guidance should point users to the MRnObrainer-owned release surface, not a legacy Screenpipe host.
- GitHub Releases remains a maintainer/release-audit surface, not the default onboarding instruction for non-technical testers.
- Hosted universal-link handling stays limited to auth and purchase-completion callbacks; settings, changelog, onboarding, and status routes remain local `mrnobrainer://` surfaces.
