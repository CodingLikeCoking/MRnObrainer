# OSS Release Checklist

Use this checklist before publishing MRnObrainer code, docs, screenshots, fixtures, or release artifacts.

## 1. Secrets and credentials

- Run `pre-commit run --all-files`.
- Run `python3 .github/scripts/validate_open_source_surface.py`.
- Run `git ls-files -z | python3 .github/scripts/filter_detect_secrets_paths.py | xargs -0 detect-secrets-hook --baseline .secrets.baseline`.
- If you need to refresh the baseline, run `detect-secrets scan --baseline .secrets.baseline .` only from a clean tree, then inspect the diff.
- Audit any new baseline entries with `detect-secrets audit .secrets.baseline`.
- Rotate or revoke anything that was ever real, even if it has now been removed from the repo.
- Verify no real `.env`, OAuth callback secrets, API keys, or signing material are tracked.
- Verify public builds do not set `NEXT_PUBLIC_POSTHOG_KEY`, `MRNOBRAINER_POSTHOG_API_KEY`, `MRNOBRAINER_SENTRY_DSN`, `SCREENPIPE_POSTHOG_API_KEY`, or `SCREENPIPE_SENTRY_DSN` unless telemetry is intentionally enabled.

## 2. URLs, fixtures, and screenshots

- Replace internal domains, personal dashboards, meeting links, inbox links, and account IDs with example values.
- Check JSON fixtures, screenshots, logs, and benchmark data for private identifiers.
- Use `example.com`, `example.org`, `example.net`, or `example.test` domains for public examples.
- Make sure screenshots do not reveal inboxes, chats, finance dashboards, or local machine names.

## 3. Docs and branding

- Confirm the root `README.md` presents the project as MRnObrainer.
- Keep public docs honest about what already exists versus what is still roadmap.
- Credit Screenpipe clearly where the current runtime lineage matters.
- Include the local-first security stance and the concise cloud/OAuth warning.
- Publish the current storage, CPU, and memory envelope in `docs/performance-envelope.md`.
- Keep `docs/tauri-capability-audit.md` in sync with the actual desktop permission surface.
- Keep the contributor ask for MCP connectors visible.

## 4. Release readiness

- Verify the GitHub Actions secret-scan workflow passes on the branch being released.
- Re-run any targeted tests affected by fixture or docs changes.
- Re-run `bunx vitest run lib/__tests__/settings-defaults.test.ts lib/__tests__/tauri-capabilities.test.ts` from `apps/mrnobrainer-app`.
- Confirm the open-source branch does not depend on private infrastructure to build.
- Double-check that example credentials are obviously fake and non-routable.

## 5. Final sign-off

- Review `git diff --stat` for accidental binary, log, or cache additions.
- Ask for a final review from someone who did not author the release prep.
- Tag the release only after the checklist is complete and documented.
