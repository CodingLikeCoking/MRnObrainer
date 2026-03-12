---
name: screenpipe-automation-drafter
description: Draft disabled Screenpipe automation bundles from an approved opportunity. Use when turning a passive suggestion into a reviewable `pipe.md` plus `automation.json` bundle.
---

# Screenpipe Automation Drafter

## Goal
Convert an approved automation opportunity into a local, disabled draft bundle that the user can inspect in Pipes.

## Required Files
- `pipe.md`: executable Screenpipe pipe, disabled by default
- `automation.json`: user-facing explanation, evidence, walkthrough, schedule, and safety metadata

## Draft Rules
- Keep the pipe disabled on creation.
- Repeat the approval mode and allowed local paths in both the prompt and `automation.json`.
- Prefer `screenpipe-pipe-creator` conventions for schedule and prompt structure.
- Keep the body explainable to a non-technical user.

## Prompt Structure
The generated `pipe.md` should:
- tell the agent to read `automation.json` first
- re-check the repeated workflow with local Screenpipe data
- draft outputs before taking privileged actions
- write a concise local completion note

## Safety
- Preserve approval stops for privileged, destructive, or external actions.
- Do not silently widen scope beyond the observed workflow.
