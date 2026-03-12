# Security Policy

MRnObrainer is a local-first desktop product with privacy-sensitive
capture and automation surfaces. Please report vulnerabilities
responsibly.

## Reporting a vulnerability

- Do not open a public GitHub issue for security problems.
- Use GitHub's private vulnerability reporting flow for this repository
  when available.
- Include the affected commit, tag, or package version, the platform,
  impact, and a minimal reproduction.
- Say whether the issue can expose captured data, credentials, local
  files, or remote execution paths.

## What to avoid sending

- No real screen recordings, private screenshots, raw audio,
  production secrets, or customer data.
- Redact tokens, account IDs, internal URLs, and machine names from
  logs or proof-of-concept material.

## Scope

Please report issues involving:

- unauthorized access to captured data or local files
- privilege escalation or command execution
- auth, update, signing, or release integrity problems
- secret leakage in repo content, fixtures, logs, or builds

## Disclosure

Please give maintainers reasonable time to investigate and ship a fix
before public disclosure. Do not assume cloud services or hosted
workflows are enabled unless the report shows that configuration
explicitly.

## Supported builds

Security fixes are typically evaluated against the current main branch
and recent public release artifacts. Older forks, private patches, and
custom integrations may require a best-effort response rather than a
backport.
