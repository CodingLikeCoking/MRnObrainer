# MRnObrainer Support Matrix

This phase is macOS-first. Other platforms remain build targets, but they are not the primary release-quality bar for onboarding, updater behavior, or local capture ergonomics.

| Area | macOS | Windows | Linux |
| --- | --- | --- | --- |
| Official desktop release focus | Primary | Secondary | Secondary |
| Signed in-app updater | Primary path for official builds | Supported by release artifacts, less emphasized | Supported by release artifacts, less emphasized |
| First-run onboarding quality bar | Primary | Functional, not launch-defining | Functional, not launch-defining |
| Screen + audio capture quality bar | Primary | Supported | Supported |
| OpenClaw worker import UI | Primary | Available where the desktop app runs | Available where the desktop app runs |
| Source build update path | Manual via GitHub Releases | Manual via GitHub Releases | Manual via GitHub Releases |

## Worker roles

| Device role | Recommended platform | Notes |
| --- | --- | --- |
| Oracle | macOS laptop or desktop | Best supported first-run and local capture experience |
| Worker | macOS mini, VM, VPS, or imported OpenClaw host | Used for remote automations and background execution |

## Build channels

| Channel | Intended audience | Update path |
| --- | --- | --- |
| Stable | Most users | Signed in-app updates for official builds |
| Beta | Testers and fast adopters | Signed in-app updates on the beta feed |
| Source/dev | Contributors | Manual updates via GitHub Releases |
