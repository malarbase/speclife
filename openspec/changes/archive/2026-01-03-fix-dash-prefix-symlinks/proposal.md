# Fix Missing Dash-Prefixed Command Symlinks

## Problem

When running `speclife init` in a new project, only the `speclife/` directory is symlinked to `.cursor/commands/` and `.claude/commands/`. The dash-prefixed command files (`speclife-release.md`, `speclife-implement.md`, etc.) are **not created**.

This means:
- `/speclife release` works (from `speclife/release.md`)
- `/speclife-release` does NOT work (missing `speclife-release.md`)

In the speclife project itself, both formats work because both file structures exist locally.

## Root Cause

The `configureEditorSymlinks` function in `packages/cli/src/index.ts` (lines 296-332) only creates a symlink for the `speclife/` directory but does not create the individual `speclife-*.md` files.

## Solution

Update `configureEditorSymlinks` to also create symlinks for each dash-prefixed command file:
- `speclife-release.md` → `speclife/release.md`
- `speclife-implement.md` → `speclife/implement.md`
- etc.

This ensures both command formats work:
- `/speclife release` (subdirectory style)
- `/speclife-release` (dash-prefixed style)

## Scope

- **In scope:** Fix the CLI init command to create dash-prefixed symlinks
- **Out of scope:** Changing the command naming convention itself

## Testing

1. Run `speclife init --force` in a test project
2. Verify both `.cursor/commands/speclife-*.md` files exist
3. Verify they are symlinks pointing to `speclife/*.md`
4. Verify both `/speclife-release` and `/speclife release` commands appear in editor

