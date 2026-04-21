# Screenpipe Agent Guidance

## Passive Automation
- Treat passive automation as a review-first workflow: detect repeated work, explain the evidence, draft a disabled automation, then ask the user to enable or run it.
- Default to end-of-day opportunity detection. Midday suggestions should use the same evidence flow with a higher confidence bar.
- Do not auto-enable a newly drafted automation.

## Evidence Order
1. Use `activity-summary` or `screenpipe-analytics` first to understand the day cheaply.
2. Use `search-content` or `screenpipe-search` to verify the repeated workflow.
3. Use `search-elements` or `screenpipe-elements` when UI structure matters.
4. Use `frame-context` only after you have a concrete frame to inspect.

## Safety
- Prefer low-risk automations for non-technical users: end-of-day updates, recap drafts, reminders, and note sync.
- Keep `askBeforePrivilegedActions` semantics intact. Anything that sends, buys, deletes, logs in, or edits external systems must stop for approval.
- Keep drafts local and scoped. When local folder scope exists, repeat it in the draft metadata and prompt.

## Draft Format
- Store the executable pipe in `pipe.md`.
- Store the user-facing explanation, walkthrough, and approval metadata in `automation.json`.
- Draft bundles should stay disabled until the user reviews them in Pipes.

## Skills And MCP
- Prefer the built-in skills `screenpipe-search`, `screenpipe-elements`, `screenpipe-analytics`, and `screenpipe-pipe-creator`.
- Prefer the Screenpipe MCP tool order `activity-summary` -> `search-content` -> `search-elements` -> `frame-context`.
- Use the automation-specific skills in `crates/screenpipe-core/assets/skills/` when the task is opportunity detection or draft generation.

## Repository Change Safety
- Treat this repo as a one-person main-only workflow unless the user explicitly asks for a separate branch. Do not create feature branches or `codex/*` branches by default.
- Do not bypass failing checks on user-critical paths with `continue-on-error` or similar soft-pass behavior.
- Do not commit real secrets, unsanitized logs, or private screenshots. Prefer fake placeholders and redacted artifacts for OSS-facing work.
- Preserve approval gates for actions that send, buy, delete, log in, publish, or modify external systems.
- When changes touch permissions, capture lifecycle, sync, telemetry, updater flow, release automation, or public docs, require explicit review and document the exact validation that ran.
- For the full policy, see `docs/agent-coding-safety-policy.md`.

## TokenBurner Workflow Routing

- This repo is the canonical upstream main repo for TokenBurner's `Memory Offload` workflow. Read `.tokenburner/repo-summary.md` before deeper work.
- For any helper/plugin handoff with `StorageClear` or `TreasureTrigger`, also consult `/Users/owenwong/Desktop/Codex/TokenBurner/state/workflow-runs.md` and `.json` so the current workflow owner stays clear.
- Keep work bounded to this repo unless TokenBurner explicitly routes the current step to another repo or the user broadens scope.
- If the workflow still needs user action, stop with the smallest unblock step; otherwise keep the bounded step moving and refresh `.tokenburner/` state.
