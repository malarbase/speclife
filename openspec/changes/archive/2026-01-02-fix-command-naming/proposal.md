# Fix Command Naming

## What

Fix the command `name` field in YAML frontmatter to use hyphens (`/speclife-start`) instead of forward slashes (`/speclife/start`).

## Why

The released version of speclife has commands showing as `/speclife/start` in the editor command palette instead of the expected `/speclife-start` format. This breaks command invocation since users type `/speclife-start` but the commands are registered as `/speclife/start`.

The `id` field is already correct (e.g., `speclife-start`), but the `name` field uses the wrong format.

## How

Update the YAML frontmatter `name` field in all affected template files:

**Files to fix in `packages/cli/templates/commands/`:**
1. `start.md` - `name: /speclife/start` → `name: /speclife-start`
2. `ship.md` - `name: /speclife/ship` → `name: /speclife-ship`
3. `land.md` - `name: /speclife/land` → `name: /speclife-land`
4. `sync.md` - `name: /speclife/sync` → `name: /speclife-sync`
5. `convert.md` - `name: /speclife/convert` → `name: /speclife-convert`

**Also fix the local commands in `openspec/commands/speclife/`** (same 5 files).

**Add missing frontmatter to:**
- `release.md`
- `implement.md`
- `setup.md`

## Acceptance Criteria

- [ ] All command `name` fields use hyphen format: `/speclife-<command>`
- [ ] All commands have consistent YAML frontmatter with `name`, `id`, `category`, `description`
- [ ] Commands are invokable as `/speclife-start`, `/speclife-ship`, etc.

