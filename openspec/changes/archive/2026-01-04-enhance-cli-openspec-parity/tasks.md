# Implementation Tasks

## 1. Infrastructure Setup

- [x] 1.1 Add `ora` and `chalk` dependencies to `packages/cli/package.json`
- [x] 1.2 Create `packages/core/src/utils/progress.ts` with progress bar utilities
- [x] 1.3 Create `packages/core/src/utils/task-progress.ts` for parsing tasks.md

## 2. Global Configuration System

- [x] 2.1 Create `packages/core/src/global-config.ts` with XDG-compliant paths
- [x] 2.2 Implement `getGlobalConfigDir()`, `getGlobalConfigPath()`
- [x] 2.3 Implement `getGlobalConfig()` and `saveGlobalConfig()`
- [x] 2.4 Add `aiProvider` and `aiModel` to global config schema
- [x] 2.5 Update `packages/core/src/config.ts` to merge global config with project config

## 3. Editor Configurator Registry

- [x] 3.1 Create `packages/core/src/configurators/base.ts` with interface
- [x] 3.2 Create `packages/core/src/configurators/registry.ts` with EditorRegistry
- [x] 3.3 Implement `packages/core/src/configurators/cursor.ts`
- [x] 3.4 Implement `packages/core/src/configurators/claude-code.ts`
- [x] 3.5 Implement `packages/core/src/configurators/windsurf.ts`
- [x] 3.6 Implement `packages/core/src/configurators/vscode.ts`
- [x] 3.7 Create `packages/core/src/configurators/detector.ts` for auto-detection

## 4. Shell Completion System

- [x] 4.1 Create `packages/core/src/completions/types.ts` with interfaces
- [x] 4.2 Create `packages/core/src/completions/bash-generator.ts`
- [x] 4.3 Create `packages/core/src/completions/zsh-generator.ts`
- [x] 4.4 Create `packages/core/src/completions/fish-generator.ts`
- [x] 4.5 Create `packages/core/src/completions/registry.ts` for shell support

## 5. CLI Commands - New

- [x] 5.1 Add `speclife view` command in `packages/cli/src/index.ts`
- [x] 5.2 Implement view dashboard with progress bars and colored output
- [x] 5.3 Add `speclife completion <shell>` command
- [x] 5.4 Add `speclife config` command with all subcommands (path, list, get, set, unset, reset, edit)
- [x] 5.5 Add `speclife validate [change-id]` command
- [x] 5.6 Add `speclife update` command for refreshing managed files

## 6. CLI Commands - Enhanced

- [x] 6.1 Enhance `speclife init` with ASCII banner
- [x] 6.2 Add multi-editor selection wizard to init
- [x] 6.3 Add preview step before writing files
- [x] 6.4 Add "next steps" display after init
- [x] 6.5 Add shell completion hint to init success message
- [x] 6.6 Add `--tools` and `--no-interactive` flags to init
- [x] 6.7 Add `ora` spinners to worktree create/remove operations
- [x] 6.8 Add `chalk` colors to status and list output
- [x] 6.9 Add `--json` flag to `speclife status`
- [x] 6.10 Add `--json` flag to `speclife list`
- [x] 6.11 Show task progress percentages in list output

## 7. Non-Interactive Support

- [x] 7.1 Add `--yes` / `-y` flag handling to commands with prompts
- [x] 7.2 Add `--no-interactive` flag that fails if input required
- [x] 7.3 Use dynamic import for `@inquirer/prompts` to avoid CI hangs

## 8. Testing

- [x] 8.1 Add unit tests for global config functions
- [x] 8.2 Add unit tests for editor configurator registry
- [x] 8.3 Add unit tests for shell completion generators
- [x] 8.4 Add unit tests for progress bar and task parsing utilities
- [x] 8.5 Add integration tests for new CLI commands

## 9. Documentation

- [x] 9.1 Update `openspec/AGENTS.md` with new command documentation
- [x] 9.2 Update README.md with new commands and features
- [x] 9.3 Add shell completion installation instructions

