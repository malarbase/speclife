# Add Retrofit Command and Dynamic Command Discovery

## What

Add a new `/speclife retrofit` slash command that formalizes ad-hoc changes made on main into a proper spec-tracked change with PR for review. Also improve the CLI to dynamically discover slash commands instead of using hardcoded lists.

## Why

**Problem:** When making quick ad-hoc changes on main (like documentation updates or small fixes), there's no easy way to properly document and ship them through the spec-driven workflow. The existing commands assume you start with `/speclife start`.

**Solution:** The `/speclife retrofit` command bridges this gap by:
1. Detecting uncommitted changes on main
2. Creating a spec (proposal + tasks) to document what was done
3. Moving changes to a spec branch
4. Creating a PR for review

Additionally, the CLI was improved to dynamically discover commands from the templates directory, eliminating the need to update hardcoded lists when adding new commands.

## How

### Retrofit Command
- Created `openspec/commands/speclife/retrofit.md` defining the workflow
- Added `packages/cli/templates/commands/retrofit.md` for distribution
- Flow: detect changes → create spec → validate → create branch → commit → archive → commit → push → PR

### Dynamic Command Discovery
- Modified `packages/cli/src/index.ts` to use `readdir()` instead of hardcoded arrays
- Commands are now discovered from:
  - `templates/commands/` directory (for init)
  - Target project's `openspec/commands/speclife/` directory (for symlinks)

### Ship Command Updates
- Updated two-commit workflow: implementation commit before archive, archive commit after
- Ensures cleaner git history separating feature work from housekeeping

## Scope

- New: `/speclife retrofit` slash command
- Modified: `packages/cli/src/index.ts` (dynamic discovery)
- Modified: `packages/cli/templates/commands/ship.md` (two-commit workflow)
- Modified: `openspec/commands/speclife/ship.md` (two-commit workflow)

