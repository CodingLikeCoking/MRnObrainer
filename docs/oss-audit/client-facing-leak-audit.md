# Client-Facing Leak Audit

Date: 2026-03-10

Scope: `apps/mrnobrainer-app` and directly user-visible desktop packaging surfaces.

## Client App Repo Map

- `apps/mrnobrainer-app/app`: Next.js pages for onboarding, overlay, notification panel, and permission recovery.
- `apps/mrnobrainer-app/components`: user-visible UI, onboarding, settings, timeline, chat, and deeplink handling.
- `apps/mrnobrainer-app/lib`: client hooks, prompts, settings defaults, and Tauri bindings.
- `apps/mrnobrainer-app/src-tauri/src`: native app commands, deep-link routing, tray/window behavior, analytics, updates, and server lifecycle.
- `apps/mrnobrainer-app/src-tauri/*.json`: Tauri bundle identifiers, deep-link hosts, updater config, and app-store-facing metadata.
- `apps/mrnobrainer-app/public`: user-visible assets shipped with the app bundle.

## Must Change Before Release

### P0

- Path: `apps/mrnobrainer-app/src-tauri/src/commands.rs:377-444`, `apps/mrnobrainer-app/src-tauri/tauri.prod.conf.json:56-106`, `apps/mrnobrainer-app/src-tauri/src/main.rs:997-1008`
- Issue: login, OAuth, startup handoff, and app config still accept `screenpipe://` and `screenpi.pe` as first-class deep-link surfaces.
- Why it matters: this is the exact mid-flow redirect/identity problem the release prep is trying to avoid. The app can still bounce through Screenpipe-branded schemes and hosts during sign-in and link handling.
- Recommended action: define one canonical public scheme/host for MRnObrainer, keep Screenpipe compatibility only as a short-lived migration layer if needed, and hide that compatibility from all user-visible copy and config shipped to end users.
- Before release: yes.

- Path: `apps/mrnobrainer-app/lib/hooks/use-team.ts:150-170`
- Issue: team invite links are still generated as `screenpipe://join-team?...`.
- Why it matters: the invite flow is directly user-visible and currently emits the old brand in copied links, screenshots, and collaboration flows.
- Recommended action: switch generated links to `mrnobrainer://...`, add compatibility parsing only on the receiving side, and update related tests/placeholders.
- Before release: yes.

- Path: `apps/mrnobrainer-app/src-tauri/tauri.prod.conf.json:4-18`, `apps/mrnobrainer-app/src-tauri/Cargo.toml:1-8`, `apps/mrnobrainer-app/public/screenpipe.svg`
- Issue: app-store-facing metadata and shipped assets still carry Screenpipe-era identifiers and blank metadata.
- Why it matters: end users, app stores, notarization flows, and support screenshots will see mixed identity. Blank `license` and `repository` fields also make the bundle look unfinished.
- Recommended action: finalize bundle identifiers, copyright, app metadata, and shipped assets for the MRnObrainer release train.
- Before release: yes.

### P1

- Path: `apps/mrnobrainer-app/src-tauri/src/reminders.rs:82-84`, `150-198`, `490-509`
- Issue: reminders integration still creates and uses a visible list named `Screenpipe`.
- Why it matters: this leaks the old name into a first-party OS surface outside the app.
- Recommended action: rename the list for new installs and decide whether to migrate or preserve legacy lists for existing users.
- Before release: yes.

- Path: `apps/mrnobrainer-app/components/deeplink-handler.tsx:109-152`, `components/rewind/chat-message.tsx:172-177`, `components/rewind/timeline.tsx:452-520`
- Issue: comments, examples, and handler branches still describe Screenpipe deep links as the primary examples.
- Why it matters: even when the runtime supports both schemes, the developer-facing and sometimes user-facing text still teaches the old brand.
- Recommended action: rewrite comments, inline help text, and examples to use only the MRnObrainer scheme.
- Before release: yes.

- Path: `apps/mrnobrainer-app/src-tauri/assets/skills/*`, `apps/mrnobrainer-app/lib/rewind/automation-runtime.ts:360-378`
- Issue: in-app automation copy still refers to “Screenpipe API” and “Screenpipe” skills.
- Why it matters: these strings will surface in automation creation, chat flows, and support screenshots.
- Recommended action: split user-facing naming from internal runtime naming. Preserve internal APIs where necessary, but ship MRnObrainer-facing copy and docs.
- Before release: yes.

## Should Change Soon

- Path: `apps/mrnobrainer-app/components/onboarding/login-gate.tsx:254`, `components/settings/google-calendar-card.tsx:154`, `lib/utils/tauri.ts:177-198`
- Issue: comments and helper text still explain the flow as a Screenpipe redirect interception.
- Why it matters: not a direct user blocker, but it keeps the codebase mentally anchored to the old product and increases the chance of future user-facing leaks.
- Recommended action: scrub internal comments that describe public flows.
- Before release: no, but bundle with the redirect cleanup.

- Path: `apps/mrnobrainer-app/components/__tests__/url-detection-benchmark-data.json`
- Issue: the benchmark fixture still contains large amounts of historic Screenpipe product text and hosted URLs.
- Why it matters: it pollutes search results, raises privacy/provenance review cost, and makes the repo feel like a partially scrubbed fork.
- Recommended action: either reduce and sanitize the fixture further or move it behind a clearly documented generated-data workflow.
- Before release: likely yes if it is part of the public repo.

- Path: `apps/mrnobrainer-app/components/ui/*`, `app/globals.css`
- Issue: internal UI comments still describe a “Screenpipe Brand” system.
- Why it matters: low user impact, but it signals unfinished rebranding to contributors and future maintainers.
- Recommended action: rename internal design comments and tokens after the public surface is stable.
- Before release: no.

## Safe To Leave For Now

- Internal method names such as `spawnScreenpipe`, `stopScreenpipe`, and `showScreenpipeShortcut` when they do not appear in end-user copy.
- Internal crate/package names like `screenpipe-*` that are not shipped as user-visible product names.
- Data directory and CLI compatibility surfaces such as `~/.screenpipe` and sidecar command names, if changing them now would add risky migrations without clear user value.

## Top Findings Summary

| Severity | Path | Issue | Why it matters | Recommended action | Before release |
| --- | --- | --- | --- | --- | --- |
| P0 | `src-tauri/src/commands.rs`, `src-tauri/tauri.prod.conf.json`, `src-tauri/src/main.rs` | Screenpipe deep-link and host compatibility is still user-visible | Mid-flow redirects and brand confusion | Make MRnObrainer the only public scheme/host | Yes |
| P0 | `lib/hooks/use-team.ts` | Invite links still emit `screenpipe://join-team` | Direct user-visible old-brand leak | Switch outbound links to MRnObrainer | Yes |
| P0 | `src-tauri/Cargo.toml`, `src-tauri/tauri.prod.conf.json`, `public/screenpipe.svg` | Bundle metadata/assets still carry Screenpipe identity or blanks | Public package looks unfinished or misbranded | Finish app metadata and shipped asset scrub | Yes |
| P1 | `src-tauri/src/reminders.rs` | OS reminders list named `Screenpipe` | Old brand leaks outside the app | Rename new list + decide migration plan | Yes |
| P1 | `src-tauri/assets/skills/*`, `lib/rewind/automation-runtime.ts` | Automation copy still says “Screenpipe API” | In-app UX still teaches old identity | Separate internal runtime naming from public copy | Yes |

## Regression Coverage To Keep

- `apps/mrnobrainer-app/components/onboarding/__tests__/read-content.test.tsx:29-35` already asserts onboarding stays local and does not send users to the Screenpipe welcome page.
- Expand this coverage to sign-in, Google Calendar OAuth, team invite links, and deep-link rendering in chat/timeline surfaces.
