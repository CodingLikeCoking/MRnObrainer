# Open-Source Packaging and OpenClaw Benchmark Audit

Date: 2026-03-10

Scope: README/docs/onboarding/contributor UX/license/security policy/issues/PR templates/CI trust signals/release surfaces/public packaging/first-run experience.

## Repo Packaging Findings

### P0

- Path: `README-ja.md:1-85`, `README-zh_CN.md:1-85`
- Issue: localized READMEs are still fully Screenpipe-branded, with Screenpipe download/docs/community links.
- Why it matters: a stranger landing on the repo will immediately see two contradictory product identities. This makes the rebrand feel accidental rather than intentional.
- Recommended action: either fully migrate or temporarily remove localized READMEs from the public launch surface until they match the English MRnObrainer story.
- Before release: yes.

- Path: `CONTRIBUTING.md:1-120`
- Issue: contributing docs are still “screen pipe” branded, ask contributors to schedule a call, and explicitly discourage some contributors.
- Why it matters: this is a poor first impression for an open-source project that wants outside contributors, investors, and press to view it as credible and welcoming.
- Recommended action: rewrite CONTRIBUTING for MRnObrainer, remove the gatekeeping language, and replace call-scheduling with a standard contributor workflow.
- Before release: yes.

- Path: repository root
- Issue: there is no `SECURITY.md` and no `CODE_OF_CONDUCT.md`.
- Why it matters: public open-source repos are expected to explain how to report vulnerabilities and what behavior standards apply. Their absence is a trust and governance gap.
- Recommended action: add concise security-reporting and code-of-conduct files before public launch.
- Before release: yes.

### P1

- Path: `.github/ISSUE_TEMPLATE/*.md`, `.github/pull_request_template.md`
- Issue: issue and PR templates still say “screenpipe” and request Screenpipe-specific log/version details.
- Why it matters: support surfaces are often the first maintainer-facing touchpoint after README. These templates currently contradict the MRnObrainer positioning.
- Recommended action: rewrite templates for MRnObrainer and add a clearer reproduction checklist plus privacy-conscious log guidance.
- Before release: yes.

- Path: `.github/workflows/publish-release.yml`, `apps/mrnobrainer-app/src-tauri/tauri.prod.conf.json`, `packages/*`, `crates/screenpipe-integrations/screenpipe-mcp/manifest.json`
- Issue: release surfaces still reference Screenpipe buckets, hosts, identifiers, icons, package names, and repository URLs.
- Why it matters: the public release pipeline currently looks like a fork mid-flight rather than a finished product surface.
- Recommended action: decide which artifacts remain intentionally Screenpipe-compatible and which must be MRnObrainer-only, then reflect that in workflows and package metadata.
- Before release: yes.

- Path: `README.md`
- Issue: the English README is much better than the surrounding repo, but it still lacks a primary screenshot/GIF, quick architecture visual, and trust-signal links in the opening screenful.
- Why it matters: the core README does not yet “feel big” or polished enough to offset the surrounding mixed surfaces.
- Recommended action: add one hero screenshot/GIF, one architecture diagram, and one “first 10 minutes” flow immediately below the value proposition.
- Before release: should fix.

- Path: `docs/mintlify/docs-mintlify-mig-tmp/*`
- Issue: the docs tree still looks like a migration scratch directory and contains many Screenpipe links and copy paths.
- Why it matters: public docs should look intentional. A `*-mig-tmp` tree undermines confidence even if the content is technically useful.
- Recommended action: either complete the docs migration or keep the temp tree out of the public-facing navigation until it is scrubbed.
- Before release: yes if docs are public.

## Existing Trust Signals Worth Keeping

- The root `README.md` is already materially better than the legacy docs and openly credits Screenpipe lineage instead of hiding it.
- `docs/OSS_RELEASE_CHECKLIST.md` is a useful maintainer artifact and shows real attention to the public surface.
- The repo has broad CI/release workflow coverage and a dedicated OSS secret-scan workflow.
- `apps/mrnobrainer-app/README.md` gives a clean app-specific entry point for contributors.

## OpenClaw Benchmark Investigation

Sources:

- [OpenClaw GitHub repository](https://github.com/openclaw/openclaw)
- [OpenClaw README](https://raw.githubusercontent.com/openclaw/openclaw/main/README.md)
- [OpenClaw docs](https://docs.openclaw.ai/get-started/introduction)

### What OpenClaw Does Well

- It states the product category immediately and gives one obvious onboarding path instead of making readers assemble their own.
- It clusters trust and navigation surfaces early: docs, install, onboarding, updates, showcase, Discord, and sponsor/community cues.
- The README feels ecosystem-shaped rather than repo-shaped. It points to docs, workflow, and community surfaces quickly, which makes the project feel larger than a code dump.
- The GitHub repo presents public-maintainer signals cleanly: visible community tabs, release surface, and security/contribution affordances.

### What Makes It Feel Large and Credible

- A single recommended command/path for getting started.
- Multiple adjacent surfaces that reinforce the same identity: repo, docs, onboarding wizard, and community.
- Strong packaging language that reads like a product, not just a framework or prototype.
- Public artifacts that imply operational maturity: docs, install/update paths, and contributor surfaces.

### Transferable Tactics For MRnObrainer

- Put one canonical “start here” path at the top of the README and docs.
- Add one small set of public trust links near the top: releases, docs, security, contributing.
- Use one screenshot/GIF plus one architecture diagram so the repo looks product-ready on first load.
- Keep the Screenpipe lineage note, but move it into an intentional “Built on Screenpipe” block instead of leaving the rest of the repo mixed.
- Make the ecosystem visible: desktop app, local runtime, MCP surface, and automation runtime should be presented as a coherent product stack.

### What Not To Copy Blindly

- Do not overstate platform breadth, automation scale, or polish beyond what the repo actually ships today.
- Do not imitate OpenClaw’s tone or visual identity directly; adopt the structure, not the persona.
- Do not create extra repos or docs surfaces unless they reduce confusion immediately. MRnObrainer needs fewer but cleaner surfaces first.

## Trust-Signal Improvements Shortlist

- Add `SECURITY.md`, `CODE_OF_CONDUCT.md`, and a cleaner PR template.
- Add one hero screenshot/GIF and one architecture diagram to `README.md`.
- Finish or hide legacy/localized Screenpipe docs until they are scrubbed.
- Replace Screenpipe-branded issue templates and contributing copy.
- Publish a simple compatibility/support matrix for macOS, Windows, Linux, and hosted versus local-only flows.
- Add a visible “Built on Screenpipe” attribution block so the lineage is explicit, honest, and contained.

## Summary Table

| Severity | Path | Issue | Why it matters | Recommended action | Before release |
| --- | --- | --- | --- | --- | --- |
| P0 | `README-ja.md`, `README-zh_CN.md` | Localized READMEs still fully Screenpipe-branded | Public identity conflict on day one | Migrate or hide until scrubbed | Yes |
| P0 | `CONTRIBUTING.md` | Legacy brand + gatekeeping contributor language | Damages OSS trust and contributor UX | Rewrite for MRnObrainer | Yes |
| P0 | repo root | Missing `SECURITY.md` and `CODE_OF_CONDUCT.md` | Weak public governance/trust surface | Add both before launch | Yes |
| P1 | `.github/ISSUE_TEMPLATE/*`, `.github/pull_request_template.md` | Templates still say Screenpipe | Support surface contradicts README | Rewrite templates | Yes |
| P1 | `README.md` | No top-of-page visual or quick architecture | Repo feels smaller/less polished than it could | Add hero visual + architecture section | Should fix |
| P1 | `docs/mintlify/docs-mintlify-mig-tmp` | Temp docs tree still looks mid-migration | Public docs feel unfinished | Complete migration or hide temp tree | Yes |
