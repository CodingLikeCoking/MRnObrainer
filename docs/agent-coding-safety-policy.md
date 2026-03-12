# Agent Coding Safety Policy

This policy defines the minimum safety bar for agent-authored changes in MRnObrainer and the Screenpipe-derived codebase.

## Scope

This policy applies to:

- coding agents working in the repository
- maintainers reviewing agent-authored pull requests
- release preparation for open-source and public-facing artifacts

## Protected Branch Policy

- Agents must not merge directly to protected branches.
- Agents must not mark their own changes as approved.
- Every agent-authored change must go through a reviewable pull request flow.
- Risky surfaces require explicit reviewer attention:
  - desktop windowing, tray, permissions, updater, capture lifecycle
  - security, privacy, telemetry, sync, auth, outbound network behavior
  - OSS docs, screenshots, fixtures, release artifacts, and public examples

## Destructive Command Policy

The following require explicit user instruction and must never be inferred:

- `git reset --hard`
- `git checkout -- <path>`
- deleting user data, logs, fixtures, screenshots, or recordings outside the scoped task
- force-pushing shared branches
- schema or state changes that destroy existing data without an approved migration plan

When a safer narrow command exists, use that instead.

## Secret Handling Policy

- Never commit real secrets, tokens, signing material, private `.env` values, or unsanitized logs.
- Never paste captured private screenshots, meeting links, inbox content, or personal identifiers into docs or fixtures without redaction.
- Public examples must use obviously fake values and example domains.
- If a secret might have been exposed, stop and surface it immediately rather than trying to hide the incident in-place.

## Network and External-System Policy

- New outbound network calls, sync targets, telemetry paths, or external-system writes require review.
- Any change that sends, buys, deletes, logs in, publishes, or edits external systems must preserve approval gating.
- Local-first behavior is the default. Cloud behavior must be explicit, reviewable, and clearly documented.

## Artifact and Screenshot Sanitation Policy

- Screenshots, traces, logs, fixtures, and release artifacts must be reviewed for private data before merge.
- OSS-facing docs must not leak internal URLs, account IDs, machine names, or non-public dashboards.
- Attached evidence should be redacted enough to be shareable in a public or semi-public review context.

## Required Human Review

Human review is mandatory when a change touches:

- `.github/` workflows, release scripts, signing, or distribution
- permission prompts, updater flow, capture health, or relaunch behavior
- auth, sync, telemetry, or public network behavior
- OSS checklist, public docs, screenshots, or release assets
- deletion logic, migrations, or automated external actions

## Agent Workflow Expectations

- Agents should make focused changes and leave a clear validation trail.
- Agents must not bypass failing checks or hide errors behind soft-pass behavior on user-critical paths.
- Agents should prefer existing, maintained tooling over custom infrastructure where possible.
- If the repo is already dirty, agents must work with the existing state and avoid reverting unrelated user changes.

## Pull Request Expectations

Every agent-authored PR should state:

- what changed
- what the risk class is
- what exact validation ran
- whether a human reviewed the final diff
- whether privacy, security, or OSS-surface impact exists

## Release Expectations

Before broader OSS distribution:

- secret scanning and public-surface checks must pass
- risky desktop flows must have reviewable evidence
- non-technical-user failure paths should be understandable and recoverable without terminal steps

## Escalation

If there is uncertainty about destructive actions, public data exposure, new network behavior, or release safety, stop and escalate instead of proceeding on assumption.
