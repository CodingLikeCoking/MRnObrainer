---
name: screenpipe-automation-opportunity-detector
description: Detect repeated workflows from Screenpipe activity and turn them into evidence-backed automation opportunities. Use for passive end-of-day suggestions, repeated work detection, or cross-device automation discovery.
---

# Screenpipe Automation Opportunity Detector

## Goal
Turn passive Screenpipe activity into a small set of credible automation suggestions that a non-technical user can understand quickly.

## Workflow
1. Start with `activity-summary` or `screenpipe-analytics` to identify broad repeated work.
2. Validate the pattern with `search-content` or `screenpipe-search`.
3. Use `search-elements` or `screenpipe-elements` only when structural UI evidence is needed.
4. Use `frame-context` only after you have a concrete frame id.

## Opportunity Bar
- Prefer patterns that repeat at least 3 times in the same day, or patterns backed by a daily-review artifact.
- Keep the first suggestions low-risk and end-of-day oriented.
- Combine cross-device evidence into one opportunity when the same workflow spans multiple device lanes.

## Output
For each opportunity, produce:
- a short title
- a simple summary
- one plain-language evidence sentence beginning with what was observed
- a walkthrough with 3-6 steps
- an estimated time-saved value
- a recommended schedule
- a risk label and required permissions

## Safety
- Never recommend fully autonomous execution as the first step.
- If the workflow touches external systems or privileged actions, mark it as approval-gated.
