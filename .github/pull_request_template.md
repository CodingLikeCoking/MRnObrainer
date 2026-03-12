# Pull Request

## Summary

What problem does this PR solve, and what changed?

## Linked issue or context

Closes #

## Change type

- [ ] product behavior
- [ ] desktop runtime / windowing / tray / permissions
- [ ] security / privacy / telemetry / auth / sync
- [ ] OSS docs / screenshots / release surface
- [ ] build / CI / release automation
- [ ] docs only

## Agent coding disclosure

- Was any part of this change authored or substantially edited by an agent?
- If yes, who reviewed the final diff before opening this PR?
- Does this change add or modify outbound network calls, secrets handling, file deletion, external-system writes, or auto-executing behavior?

## Validation

- ``
- ``

Manual checks:

- None

Required evidence for risky changes:

- windowing / tray / fullscreen / monitor routing: attach exact checks from `TESTING.md`
- permissions / capture / relaunch / updater / sync: attach screenshots or logs with redaction
- OSS-facing docs / screenshots / fixtures: confirm they were checked for private data and branding consistency

## Privacy and security review

- Does this change affect permissions, captured data, sync, telemetry,
  auth, or update flow?
- Are attached screenshots/logs fully redacted?
- If there is security impact, is it described clearly without exposing
  exploit details?
- Does this change introduce new secrets, credentials, signing material,
  localhost assumptions, or public-surface risk?
- If this PR adds or changes networked behavior, is the data boundary clear
  and reviewed?

## Checklist

- [ ] I read [docs/CHANGE_RULES.md](../docs/CHANGE_RULES.md).
- [ ] This PR is one focused change-set.
- [ ] Tests or docs were updated where needed.
- [ ] I listed the exact checks I ran.
- [ ] I did not include secrets, private recordings, or unsanitized logs.
- [ ] I did not bypass failing checks or rely on `continue-on-error` for a
  user-critical path.
- [ ] I requested review from the code owner for any risky surface touched.
- [ ] If an agent helped write this PR, a human reviewed the final diff.
