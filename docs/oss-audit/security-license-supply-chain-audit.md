# Security, License, and Supply-Chain Audit

Date: 2026-03-10

Scope: whole repository, with emphasis on public-release security, license compliance, provenance, and dependency risk.

This is not legal advice. It is a release-readiness engineering audit intended to identify issues that require explicit product, legal, or maintainer decisions.

## Observed Provenance Map

- Root repo license: `LICENSE.md` declares MIT for the repository, except `ee/`.
- Enterprise carve-out: `ee/README.md` and `ee/LICENSE` keep `ee/` under the Screenpipe Enterprise License with production and redistribution restrictions.
- Workspace metadata: `Cargo.toml` still declares `repository = "https://github.com/screenpipe/screenpipe"` and `license = "MIT OR Apache-2.0"` for workspace crates.
- App metadata: `apps/mrnobrainer-app/src-tauri/Cargo.toml` still has blank `license` and `repository` fields.
- Public package metadata: `packages/agent`, `packages/skills`, `packages/sync`, and the MCP manifest still publish under Screenpipe names and repository links.
- Hosted service dependencies: the desktop app still talks to `screenpi.pe` APIs for login, updates, billing, attribution, cloud sync, referrals, and license validation.

## Must Keep Attribution / Notice Surfaces

- Root MIT notice in `LICENSE.md`.
- The explicit lineage note in `README.md` (“Thanks to Screenpipe”).
- Enterprise headers and license notices inside `ee/` until that directory is either removed from the public repo or relicensed with authorization.
- Upstream notices for copied or vendored assets, docs, screenshots, and package manifests that still reference Screenpipe or third-party repos.

## Top Findings

### P0

- Path: `LICENSE.md:25-27`, `Cargo.toml:8-13`
- Issue (observed): repository-level license and workspace SPDX metadata do not match. The root license says MIT-only for most of the repo, while workspace crates advertise `MIT OR Apache-2.0`.
- Why it matters: public consumers, package scanners, and lawyers will get contradictory answers about what license actually governs the code.
- Recommended action: reconcile repo-level licensing, crate SPDX fields, and published package metadata before any public announcement.
- Implementation risk: low code risk, medium coordination risk.
- Before release: yes.

- Path: `ee/LICENSE`, `ee/README.md:1-20`
- Issue (observed): the repository contains code under the Screenpipe Enterprise License, including explicit restrictions on production use and redistribution.
- Why it matters: if MRnObrainer is presented as a clean open-source release, shipping `ee/` unchanged creates immediate legal/provenance questions about what is actually open and what the maintainers are allowed to redistribute under the new brand.
- Recommended action: make an explicit release decision for `ee/`: keep with prominent legal framing, split to a separate private/commercial repo, or remove from the first public MRnObrainer release until rights and messaging are settled.
- Implementation risk: medium.
- Before release: yes.

### P1

- Path: `.pre-commit-config.yaml:8-15`, `.github/workflows/secret-scan.yml:31-40`, `.github/scripts/validate_open_source_surface.py`
- Issue (observed): local `detect-secrets` pre-commit hooks still target the old `apps/screenpipe-app-tauri/...` fixture path, while CI validates the current `apps/mrnobrainer-app/...` fixture.
- Why it matters: maintainers can get a false sense of local secret-scan coverage, especially on the 4.6 MB benchmark fixture that is part of the public OSS surface.
- Recommended action: align pre-commit, CI, and validation script targets so the same public surface is scanned locally and in CI.
- Implementation risk: low.
- Before release: yes.

- Path: `apps/mrnobrainer-app/src-tauri/src/main.rs:1017-1035`, `1668-1674`, `apps/mrnobrainer-app/src-tauri/src/analytics.rs:72-120`, `apps/mrnobrainer-app/lib/hooks/use-settings.tsx:247-250`
- Issue (observed): telemetry is default-on, PostHog and Sentry credentials are hardcoded, and the app fetches UTM attribution by IP matching from `screenpi.pe`.
- Why it matters: for a local-first open-source product, this is a privacy and trust review item. Even if technically acceptable, it is surprising enough that it must be clearly documented and intentionally consented to.
- Recommended action: document the telemetry model, review opt-in versus opt-out behavior, and decide whether IP-based attribution belongs in the public build.
- Implementation risk: medium.
- Before release: yes.

- Path: `apps/mrnobrainer-app/src-tauri/Cargo.toml:1-8`, `packages/agent/package.json:1-31`, `packages/skills/package.json:1-31`, `packages/sync/package.json:1-29`, `crates/screenpipe-integrations/screenpipe-mcp/manifest.json:1-19`
- Issue (observed): published metadata still points to Screenpipe repositories, names, and authors while the repo is marketed as MRnObrainer.
- Why it matters: provenance is clearer when explicit, but mixed metadata without a policy reads like an unfinished fork rather than an intentional lineage.
- Recommended action: decide package-by-package whether the public package remains Screenpipe-branded, becomes MRnObrainer-branded, or is held back from the first public release. Reflect that decision consistently in metadata.
- Implementation risk: medium.
- Before release: yes.

- Path: `crates/screenpipe-vision/Cargo.toml:28,80,83,84`, `apps/mrnobrainer-app/src-tauri/Cargo.toml:80,145,146,152`
- Issue (observed): the repo depends on several git-sourced forks and non-registry dependencies, including Screenpipe-owned forks.
- Why it matters: open-source consumers will expect an explanation of why these forks exist, whether they are maintained, and what licenses govern them.
- Recommended action: create a third-party/provenance inventory for all git dependencies and call out the ones that must be reviewed or upstreamed later.
- Implementation risk: low to medium.
- Before release: yes.

## Release Decision Needed For `ee/`

- Conservative default: do not ship `ee/` as part of the first MRnObrainer public launch unless maintainers are comfortable with the Screenpipe Enterprise License terms remaining visible under the new brand.
- Safer alternatives:
  - move `ee/` to a clearly separate private/commercial repository,
  - keep it in the repo but label it as excluded from the MRnObrainer open-source release scope,
  - or replace it with stubs/documentation only in the public branch.

## What Should Go Into Public Legal/Trust Surfaces

- `LICENSE.md`: reconciled top-level license story.
- `NOTICE.md` or `THIRD_PARTY.md`: Screenpipe lineage, enterprise carve-out status, and notable git dependencies/forks.
- `README.md`: brief, honest lineage note and clear statement of what is open versus what is not.
- Package metadata: non-empty `license`, `repository`, and maintainer fields for every released crate/package/app bundle.
- Public docs: a short privacy/telemetry section covering Sentry, PostHog, and hosted API usage.

## Summary Table

| Severity | Area | Issue | Recommended action | Before release |
| --- | --- | --- | --- | --- |
| P0 | `LICENSE.md`, `Cargo.toml` | License metadata conflict | Reconcile repo license and crate SPDX fields | Yes |
| P0 | `ee/` | Restricted enterprise code inside public repo | Make an explicit keep/split/remove decision | Yes |
| P1 | `.pre-commit-config.yaml` | Local secret scan misses current fixture path | Align local and CI secret-scan scope | Yes |
| P1 | `main.rs`, `analytics.rs`, `use-settings.tsx` | Default-on telemetry and IP attribution | Document and review consent/privacy posture | Yes |
| P1 | package manifests and MCP manifest | Mixed Screenpipe/MRnObrainer provenance metadata | Adopt a package-by-package public naming policy | Yes |
| P1 | git dependencies | Supply-chain story is undocumented | Publish dependency/provenance inventory | Yes |
