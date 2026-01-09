# Add Antigravity Editor Support

## Summary

Add support for Google's Antigravity IDE to SpecLife's editor configurator registry. Antigravity uses a flat file structure in `.agent/workflows/` with dash-prefixed command files (e.g., `speclife-start.md`), differing from other editors that use subdirectory structures.

## Motivation

The OpenSpec project already supports Antigravity via its slash command configurator. SpecLife should provide the same support so Antigravity users can access workflow commands (`/speclife-start`, `/speclife-ship`, etc.) without manual setup.

## Approach

Create an `AntigravityConfigurator` following the existing pattern but with key differences for Antigravity's flat file structure:

**Antigravity Configurator** (`antigravity.ts`)
- Config directory: `.agent`
- Command paths: `.agent/workflows/speclife-<cmd>.md` (flat, dash-prefixed)
- Creates individual symlinks per command file (NOT a directory symlink)
- Each symlink points to `openspec/commands/speclife/<cmd>.md`

**File mapping:**
```
.agent/workflows/speclife-start.md    → openspec/commands/speclife/start.md
.agent/workflows/speclife-ship.md     → openspec/commands/speclife/ship.md
.agent/workflows/speclife-land.md     → openspec/commands/speclife/land.md
.agent/workflows/speclife-sync.md     → openspec/commands/speclife/sync.md
.agent/workflows/speclife-release.md  → openspec/commands/speclife/release.md
.agent/workflows/speclife-setup.md    → openspec/commands/speclife/setup.md
.agent/workflows/speclife-convert.md  → openspec/commands/speclife/convert.md
.agent/workflows/speclife-retrofit.md → openspec/commands/speclife/retrofit.md
.agent/workflows/speclife-implement.md→ openspec/commands/speclife/implement.md
```

**Key differences from other configurators:**
1. Uses `workflows/` instead of `commands/`
2. Flat structure with dash-prefixed files instead of subdirectory
3. Similar to Cursor's dash-prefix handling but as the primary (not secondary) structure

## Out of Scope

- Frontmatter injection (Antigravity uses `---\ndescription: ...\n---` but symlinks preserve source format)
- TOML format support
- Global configuration

## Risks

- **Frontmatter compatibility**: Antigravity expects YAML frontmatter with `description:`. The existing markdown commands have Cursor-style frontmatter which may not be fully compatible. Mitigation: Test and potentially add Antigravity-compatible frontmatter to source files.

## Acceptance Criteria

- [ ] `speclife init --tools antigravity` configures Antigravity
- [ ] Antigravity appears in `speclife init` editor selection
- [ ] Creates symlinks at `.agent/workflows/speclife-*.md`
- [ ] Existing tests continue to pass
- [ ] New configurator has unit tests
