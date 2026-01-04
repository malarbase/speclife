# Proposal: Enhance CLI with OpenSpec-Inspired Features

## Why

SpecLife's CLI lacks several user-experience features that OpenSpec has refined over 15+ releases. Users switching between tools experience friction from:
- No visual dashboard to see worktree/change status at a glance
- Basic console output without progress indicators or colors
- No shell completions for faster command entry
- Limited init wizard that doesn't match OpenSpec's polished experience
- No configuration management beyond the initial `.specliferc.yaml`

OpenSpec has solved these problems elegantly. Bringing feature parity improves SpecLife's usability and aligns the tools' UX for users who use both.

## What Changes

### New CLI Commands

1. **`speclife view`** - Interactive dashboard
   - Show worktrees with branch/PR status
   - Display task progress bars
   - Group by state (draft/active/ready to land)

2. **`speclife completion <shell>`** - Shell completions
   - Support bash, zsh, fish
   - Dynamic completion for change-ids, worktree names

3. **`speclife config`** - Configuration management
   - Subcommands: `path`, `list`, `get`, `set`, `unset`, `reset`, `edit`
   - XDG-compliant global config location
   - JSON output option

4. **`speclife validate [change-id]`** - Pre-flight checks
   - Check branch exists and is up-to-date
   - Verify PR status (if exists)
   - Check task completion
   - JSON output for CI

5. **`speclife update`** - Refresh managed files
   - Update slash command templates
   - Preserve user customizations outside managed blocks
   - Refresh editor symlinks

### Enhanced Existing Commands

6. **Enhanced `speclife init`** - Richer initialization wizard
   - ASCII banner on start
   - Multi-step wizard with preview
   - Multi-editor selection (Cursor, Claude Code, VS Code, Windsurf, etc.)
   - "Next steps" prompts to copy

7. **Enhanced `speclife list` / `speclife status`**
   - Add `ora` progress spinners
   - Colorized output with `chalk`
   - Task progress percentages
   - `--json` flag for scripting

### Infrastructure

8. **Editor Configurator Registry** - Pluggable editor support
   - Abstract `EditorConfigurator` interface
   - Registry pattern for adding new editors
   - Each editor has its own configurator class

9. **CI-Friendly Flags**
   - Add `--no-interactive` / `--yes` to all prompting commands
   - Dynamic import of `@inquirer/prompts` to avoid CI hangs

## Impact

### Affected Specs
- `core/spec.md` - New configuration requirements
- New `cli/spec.md` - CLI-specific requirements

### Affected Code
- `packages/cli/src/index.ts` - New commands
- `packages/core/src/config.ts` - Global config support
- New `packages/core/src/configurators/` - Editor registry
- New `packages/core/src/completions/` - Shell completion generators
- New `packages/cli/src/commands/` - Command implementations

### Dependencies
- Add: `ora` (spinners), `chalk` (colors)
- Existing: `commander`, `cosmiconfig`

## Out of Scope

- Workflow schema system (artifact graphs) - too complex for initial parity
- Supporting all 15+ editors OpenSpec supports - start with top 4-5
- MCP server changes - this is CLI-focused

