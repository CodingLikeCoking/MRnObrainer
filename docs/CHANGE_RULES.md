# Change Rules

These rules apply to every public MRnObrainer change-set: human or
agent, code or docs.

## 1. Keep changes small

- One PR should solve one problem.
- One commit should be easy to explain and safe to revert.
- Every commit should stay deployable where practical.
- Do not mix behavior changes with unrelated refactors, formatting
  churn, or generated noise.

## 2. Commit subject format

Use:

```text
<type>(<scope>): <summary>
```

Examples:

```text
fix(app): stop reopening the onboarding modal
docs(contributing): add privacy-safe repro guidance
ci(release): tighten OSS secret scan inputs
```

Rules:

- Allowed `type`: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`,
  `build`, `ci`, `perf`.
- Keep the subject imperative and specific.
- Keep the subject under 72 characters when possible.
- Do not put issue numbers, release flags, or long rationale in the subject.
- Reserve release automation keywords such as `release-app` and
  `release-app-publish` for maintainer-owned release commits only.

## 3. Commit body template

Use this body for non-trivial commits:

```text
Why:
- what problem this solves

What:
- the concrete change

Validation:
- command(s) run
- manual checks performed

Privacy:
- none
```

Notes:

- If you did not run a check, say so.
- If privacy or security impact exists, replace `none` with a brief,
  concrete note.
- If a change is docs-only and no validation applies, say
  `Validation: not run (docs-only)`.

## 4. PR and change-set rules

Every PR should:

- link the issue, audit item, or problem statement it addresses
- explain user-visible, privacy, and security impact
- list exact validation commands and manual checks
- include screenshots only when they add review value, and only after redaction
- keep examples, fixtures, logs, and URLs obviously fake or sanitized
- update docs when behavior, permissions, packaging, or contributor workflow changes

Avoid:

- drive-by cleanups in the same PR
- hidden breaking changes
- raw captured data, private screenshots, private audio, secrets, or
  customer/internal logs
- unsupported promises about support, disclosure timelines, or product behavior

## 5. Agent-specific rules

Agents working in this repository must:

- read the file they plan to edit before editing it
- stay inside the assigned scope and never revert unrelated user changes
- prefer the smallest patch that satisfies the request
- say exactly what they validated and what they did not validate
- avoid release-only commit keywords unless the user explicitly asked
  for a release action
- keep MRnObrainer public docs aligned with the English README and OSS
  posture

## 6. Privacy-first examples

- Use `example.com` domains and fake identifiers.
- Redact machine names, inboxes, meetings, account IDs, and tokens.
- Never upload real recordings or raw capture output to issues or PRs.

When in doubt, choose the narrower, cleaner, more reviewable change.
