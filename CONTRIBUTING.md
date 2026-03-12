# Contributing to MRnObrainer

Thanks for contributing. MRnObrainer is a local-first,
privacy-sensitive OSS project built on the Screenpipe runtime lineage.
Keep changes small, reviewable, and honest about user impact.

## Start here

- Read [README.md](README.md) for the current product and release posture.
- Read [docs/CHANGE_RULES.md](docs/CHANGE_RULES.md) before writing
  commits or opening a PR.
- Read [TESTING.md](TESTING.md) if your change touches capture,
  permissions, desktop UI, platform packaging, or release flows.
- Read [SECURITY.md](SECURITY.md) instead of opening a public issue for a vulnerability.

## Environment setup

Use the root [README.md](README.md) for the current platform-specific
install and build path. For most app work:

```bash
python3 -m pip install pre-commit detect-secrets
pre-commit install

cd apps/mrnobrainer-app
bun install
bun dev
```

Useful checks:

```bash
pre-commit run --all-files
cargo test
```

Run narrower checks when a full suite is unnecessary, but document
exactly what you ran in the PR.

## Before you open an issue

- Search existing issues and PRs first.
- Use the matching issue template.
- Keep reports reproducible and privacy-conscious.
- Do not post secrets, private recordings, raw screen captures, or
  customer/internal data.
- If a bug only appears with sensitive logs or media, share the minimum
  redacted excerpt needed to explain it.

## Before you open a pull request

1. Make one focused change-set.
2. Add or update tests when behavior changes.
3. Update docs when commands, UX, permissions, or contributor workflows change.
4. Run relevant validation and include the exact commands in the PR.
5. Fill out the PR template completely, including privacy and security notes.

## Privacy and data handling

This repository deals with screen, audio, automation, and local
context. Public contributions must be extra careful:

- Never commit real captured data, production tokens, OAuth
  credentials, or private URLs.
- Prefer `example.com`, `example.org`, `example.net`, or obviously fake
  identifiers in examples.
- Redact screenshots, logs, traces, and fixtures before attaching them
  to issues or PRs.
- Keep local-first behavior intact unless the change explicitly adds an
  opt-in hosted path.

## Style and scope

- Prefer small, deployable commits over large mixed rewrites.
- Avoid unrelated refactors in the same PR.
- Preserve explicit MRnObrainer public wording on docs and user-facing
  OSS surfaces.
- Keep Screenpipe references only where lineage or package
  compatibility matters.
- If you use an AI coding agent, it must follow [AGENTS.md](AGENTS.md)
  and [docs/CHANGE_RULES.md](docs/CHANGE_RULES.md).

## Community expectations

By participating, you agree to follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Need more context?

- Product and OSS posture: [README.md](README.md)
- Release hygiene: [docs/OSS_RELEASE_CHECKLIST.md](docs/OSS_RELEASE_CHECKLIST.md)
- Change hygiene: [docs/CHANGE_RULES.md](docs/CHANGE_RULES.md)
- Security reporting: [SECURITY.md](SECURITY.md)
