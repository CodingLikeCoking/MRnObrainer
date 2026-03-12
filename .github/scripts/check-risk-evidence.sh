#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${GITHUB_EVENT_PATH:-}" || ! -f "${GITHUB_EVENT_PATH:-}" ]]; then
  echo "check-risk-evidence: local execution detected, skipping PR body validation"
  exit 0
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "check-risk-evidence: python3 is required" >&2
  exit 1
fi

if [[ "${RISK_WINDOWING:-false}" != "true" ]] \
  && [[ "${RISK_CAPTURE:-false}" != "true" ]] \
  && [[ "${RISK_OSS_SURFACE:-false}" != "true" ]]; then
  echo "check-risk-evidence: no risky file groups changed"
  exit 0
fi

event_kind="$(
  python3 - "$GITHUB_EVENT_PATH" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as fh:
    event = json.load(fh)

pr = event.get("pull_request") or {}
if pr:
    print("pull_request")
PY
)"

if [[ "$event_kind" != "pull_request" ]]; then
  echo "check-risk-evidence: skipping because this is not a pull request event"
  exit 0
fi

pr_body="$(
  python3 - "$GITHUB_EVENT_PATH" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as fh:
    event = json.load(fh)

pr = event.get("pull_request") or {}
print((pr.get("body") or "").strip())
PY
)"

if [[ -z "${pr_body}" ]]; then
  echo "check-risk-evidence: pull request body is empty for a risky change" >&2
  exit 1
fi

missing=0

marker_line() {
  local marker="$1"
  printf '%s\n' "$pr_body" | grep -Ei "^[[:space:]>-]*Risk-Evidence:[[:space:]]*${marker}[[:space:]]*\\|[[:space:]]*.+$" | head -n 1
}

require_marker_line() {
  local enabled="$1"
  local marker="$2"
  local guidance="$3"

  if [[ "$enabled" != "true" ]]; then
    return
  fi

  local line
  line="$(marker_line "$marker")"
  if [[ -n "$line" ]]; then
    printf '%s\n' "$line"
    return
  fi

  echo "::error title=Missing PR evidence::Add \`Risk-Evidence: ${marker} | ...\` to the PR body and include ${guidance}."
  missing=1
}

validate_windowing_line() {
  local line="$1"
  if ! grep -Eiq 'TESTING\.md' <<<"$line" || ! grep -Eiq 'section[s]?[[:space:]]+[0-9]|checklist' <<<"$line"; then
    echo "::error title=Missing windowing evidence::Windowing evidence must cite \`TESTING.md\` and the exact section or checklist items used." >&2
    missing=1
    return
  fi
  echo "check-risk-evidence: validated windowing evidence"
}

validate_capture_line() {
  local line="$1"
  if ! grep -Eiq 'screenshot|screenshots|log|logs|artifact|artifacts' <<<"$line"; then
    echo "::error title=Missing capture evidence::Capture evidence must mention attached screenshots, logs, or artifacts." >&2
    missing=1
    return
  fi
  if ! grep -Eiq 'redact|redacted|capture health' <<<"$line"; then
    echo "::error title=Missing capture detail::Capture evidence must mention redaction or explicit capture-health evidence." >&2
    missing=1
    return
  fi
  echo "check-risk-evidence: validated capture evidence"
}

validate_oss_surface_line() {
  local line="$1"
  if ! grep -Eiq 'review|reviewed' <<<"$line"; then
    echo "::error title=Missing OSS review::OSS-surface evidence must state that the assets/docs were reviewed." >&2
    missing=1
    return
  fi
  if ! grep -Eiq 'redact|redaction' <<<"$line"; then
    echo "::error title=Missing OSS redaction detail::OSS-surface evidence must mention redaction review." >&2
    missing=1
    return
  fi
  if ! grep -Eiq 'branding' <<<"$line"; then
    echo "::error title=Missing OSS branding detail::OSS-surface evidence must mention branding consistency review." >&2
    missing=1
    return
  fi
  if ! grep -Eiq 'docs|screenshot|screenshots|fixture|fixtures|asset|assets' <<<"$line"; then
    echo "::error title=Missing OSS asset scope::OSS-surface evidence must mention the docs, screenshots, fixtures, or assets reviewed." >&2
    missing=1
    return
  fi
  echo "check-risk-evidence: validated oss_surface evidence"
}

windowing_line="$(require_marker_line "${RISK_WINDOWING:-false}" "windowing" "the exact \`TESTING.md\` sections or checklist items used for windowing, tray, fullscreen, or monitor-routing changes")"
capture_line="$(require_marker_line "${RISK_CAPTURE:-false}" "capture" "redacted screenshots, logs, artifacts, or explicit capture-health evidence for permissions, capture, relaunch, updater, or sync changes")"
oss_surface_line="$(require_marker_line "${RISK_OSS_SURFACE:-false}" "oss_surface" "a note confirming OSS-facing docs, screenshots, fixtures, or assets were reviewed for private-data redaction and branding consistency")"

if [[ -n "${windowing_line:-}" ]]; then
  validate_windowing_line "$windowing_line"
fi

if [[ -n "${capture_line:-}" ]]; then
  validate_capture_line "$capture_line"
fi

if [[ -n "${oss_surface_line:-}" ]]; then
  validate_oss_surface_line "$oss_surface_line"
fi

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

echo "check-risk-evidence: PR evidence checks passed"
