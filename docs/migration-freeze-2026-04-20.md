# MRnObrainer migration freeze — 2026-04-20

Source repo: `/Users/owenwong/Desktop/Codex/screenpipe-android-oracle`

## Purpose

This document freezes the Screenpipe-derived repo state before the clean MRnObrainer repo migration starts.

## Frozen references

- main: `e0e7b881d8dd6218f251941224105f8d9c16a368`
- current branch: `codex/stabilization-prod-unblock-2026-04-06`
- current branch head: `b6bfa43`
- notable side branch with unique commits: `codex/overnight-stabilize-2026-04-05-14-09-50` @ `1af85f1`

## Current app target

The migration target is the installed macOS app at `/Applications/MRnObrainer.app`.
Only code needed for that installed app's build chain, startup chain, runtime chain,
and its immediate signing/updater/install surfaces should move into the clean repo.

## Known context pollution in source repo

- `apps/mrnobrainer-app/.next`
- `apps/mrnobrainer-app/out`
- `apps/mrnobrainer-app/output`
- root `target`
- Screenpipe-derived `packages/*` surfaces that are not direct installed-app runtime dependencies
- temporary `codex/*` branches

## Working tree at freeze time

The exact git diff, index diff, branch list, and status snapshot were archived under:

`~/.codex/archives/mrnobrainer-migration-freeze-2026-04-20/`
