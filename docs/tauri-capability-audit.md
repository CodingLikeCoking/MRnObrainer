# Tauri Capability Audit

This note documents the current MRnObrainer desktop capability surface after the March 2026 hardening pass.

## Tightened in this pass

Removed unused remote host allowlist entries from:

- `apps/mrnobrainer-app/src-tauri/capabilities/main.json`
- `apps/mrnobrainer-app/src-tauri/gen/schemas/capabilities.json`

Removed hosts:

- `https://*.anthropic.com/*`
- `https://*.ollama.ai/*`

Those domains were present in the Tauri allowlist but were not required by the current desktop UI flows.

## Explicitly kept

These hosts are still required by the current shipping app:

- `https://screenpi.pe/*`
  - login, billing, sync, referrals, Google Calendar auth, pipe sharing, and other hosted account flows
- `https://api.screenpi.pe/*`
  - Pi provider defaults, billing usage, cloud audio endpoints, region OCR overlay, and other cloud APIs
- `https://api.github.com/*`
  - release listing and GitHub-backed integration install flows
- `https://github.com/*`
  - release pages and installer redirects
- `https://objects.githubusercontent.com/*`
- `https://release-assets.githubusercontent.com/*`
  - GitHub release asset downloads used by connection and installer flows
- `https://api.openai.com/*`
- `https://*.openai.com/*`
  - OpenAI model/account flows used by the current AI provider setup
- `http://localhost:*`
- `http://127.0.0.1:*`
  - local embedded server and local runtime communication

## Capability areas that remain broad

These permissions are still wider than ideal, but they map to active product behavior today:

- wildcard browser-launch rules in `shell:allow-open` and `opener:allow-open-url`
  - intentionally separate from the HTTP fetch allowlist because they cover external browser/app launches rather than silent in-app requests
- broad `.screenpipe` filesystem access
  - required for local runtime state, cache, logs, pipes, and media access
- `.cursor` and Claude config access
  - required by the current connections/import flows
- `screenpipe` shell execution
  - required for pipe management and local runtime control
- `open` and `cmd` shell execution
  - required for external app launch and Windows-specific command paths
- legacy `screenpipe` deep-link compatibility
  - still needed for hosted auth flows and backward compatibility

## What still needs tightening

The next hardening step is not another blind allowlist trim. It is product scoping:

1. Move optional account and integration flows behind clearer user action.
2. Split capability sets by surface instead of one large migrated bundle.
3. Remove legacy `screenpipe` deep-link usage once hosted auth no longer depends on it.
4. Reduce shell and filesystem scope after the connections/import UX is narrowed.

Until that refactor lands, the current repo should treat this file as the justification for the remaining broad scope.
