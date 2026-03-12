# MRnObrainer Ship Checklist

## Before Starting

- Confirm `CURRENT_FOCUS.md` still reflects the current milestone
- Confirm no known onboarding, permission, or trust blocker is being ignored
- Confirm side-project work is not delaying MRnObrainer release work

## Required Commands

- `bun run doctor`
- `bun run smoke`
- `bun run test` for the touched area
- `bun run build` or `bun run ship`

## Required Evidence

- Summary of what changed
- What was tested
- Known issues that remain
- Rollback note
- Link or path to the generated ship packet

## Final Gate

- Release remains manual
- If onboarding, permissions, or capture trust are not good enough for a non-technical user, do not ship
