# cli Specification

## Purpose
TBD - created by archiving change enhance-cli-openspec-parity. Update Purpose after archive.
## Requirements
### Requirement: View Command
The CLI SHALL provide a `speclife view` command that displays an interactive dashboard summarizing project state.

#### Scenario: Display dashboard with active changes
- **WHEN** user runs `speclife view`
- **THEN** the CLI displays:
  - Summary metrics (total changes, specs, task progress)
  - Draft changes (no tasks defined)
  - Active changes with progress bars
  - Ready-to-land changes (100% tasks complete)
  - Worktree paths and branch associations

#### Scenario: Empty project
- **WHEN** user runs `speclife view` with no active changes
- **THEN** the CLI displays "No active changes" with helpful next steps

#### Scenario: Progress bar rendering
- **WHEN** displaying an active change
- **THEN** the CLI shows a visual progress bar like `[████░░░░░░] 40%`

---

### Requirement: Completion Command
The CLI SHALL provide a `speclife completion <shell>` command that outputs shell completion scripts.

#### Scenario: Generate bash completions
- **WHEN** user runs `speclife completion bash`
- **THEN** the CLI outputs a bash completion script to stdout

#### Scenario: Generate zsh completions
- **WHEN** user runs `speclife completion zsh`
- **THEN** the CLI outputs a zsh completion script to stdout

#### Scenario: Generate fish completions
- **WHEN** user runs `speclife completion fish`
- **THEN** the CLI outputs a fish completion script to stdout

#### Scenario: Unsupported shell
- **WHEN** user runs `speclife completion unknown`
- **THEN** the CLI exits with error listing supported shells

#### Scenario: Dynamic change-id completion
- **WHEN** user types `speclife status <TAB>`
- **THEN** the shell completes with active change IDs

---

### Requirement: Config Command
The CLI SHALL provide a `speclife config` command for managing configuration.

#### Scenario: Show config path
- **WHEN** user runs `speclife config path`
- **THEN** the CLI outputs the path to the global config file

#### Scenario: List all config values
- **WHEN** user runs `speclife config list`
- **THEN** the CLI outputs all current configuration values

#### Scenario: List config as JSON
- **WHEN** user runs `speclife config list --json`
- **THEN** the CLI outputs configuration as valid JSON

#### Scenario: Get specific config value
- **WHEN** user runs `speclife config get <key>`
- **THEN** the CLI outputs the raw value (scriptable)

#### Scenario: Get missing key
- **WHEN** user runs `speclife config get nonexistent.key`
- **THEN** the CLI exits with code 1 and no output

#### Scenario: Set config value
- **WHEN** user runs `speclife config set <key> <value>`
- **THEN** the CLI saves the value and confirms the change

#### Scenario: Unset config value
- **WHEN** user runs `speclife config unset <key>`
- **THEN** the CLI removes the key and reverts to default

#### Scenario: Reset all config
- **WHEN** user runs `speclife config reset --all --yes`
- **THEN** the CLI resets all configuration to defaults

#### Scenario: Edit config in editor
- **WHEN** user runs `speclife config edit`
- **THEN** the CLI opens the config file in `$EDITOR`

---

### Requirement: Validate Command
The CLI SHALL provide a `speclife validate [change-id]` command for pre-flight checks.

#### Scenario: Validate specific change
- **WHEN** user runs `speclife validate add-feature`
- **THEN** the CLI checks branch exists, PR status, and task completion

#### Scenario: Validate current branch
- **WHEN** user runs `speclife validate` without argument on a spec branch
- **THEN** the CLI validates the change associated with current branch

#### Scenario: All checks pass
- **WHEN** all validation checks pass
- **THEN** the CLI outputs success message and exits with code 0

#### Scenario: Validation failures
- **WHEN** one or more checks fail
- **THEN** the CLI outputs each failure with suggestions and exits with code 1

#### Scenario: JSON output
- **WHEN** user runs `speclife validate --json`
- **THEN** the CLI outputs structured validation results as JSON

---

### Requirement: Update Command
The CLI SHALL provide a `speclife update` command to refresh managed files.

#### Scenario: Update slash command templates
- **WHEN** user runs `speclife update`
- **THEN** the CLI updates slash command templates to latest version

#### Scenario: Preserve user customizations
- **WHEN** updating files with user customizations outside managed blocks
- **THEN** the CLI preserves those customizations

#### Scenario: Refresh editor symlinks
- **WHEN** running update with new editors configured
- **THEN** the CLI creates/updates editor-specific symlinks

---

### Requirement: Enhanced Init Wizard
The CLI SHALL provide an enhanced `speclife init` experience with interactive selection.

#### Scenario: Display ASCII banner
- **WHEN** user runs `speclife init`
- **THEN** the CLI displays a branded ASCII banner

#### Scenario: Auto-detect installed editors
- **WHEN** in interactive mode
- **THEN** the CLI detects installed editors and pre-selects them

#### Scenario: Multi-editor selection
- **WHEN** in interactive mode
- **THEN** the CLI presents a multi-select list with detected editors pre-selected

#### Scenario: Preview before writing
- **WHEN** editors are selected
- **THEN** the CLI shows a review step before creating files

#### Scenario: Non-interactive mode
- **WHEN** user runs `speclife init --tools cursor,claude --no-interactive`
- **THEN** the CLI skips prompts and uses specified tools

#### Scenario: Display next steps
- **WHEN** init completes
- **THEN** the CLI displays actionable next steps the user can copy

#### Scenario: Display completion hint
- **WHEN** init completes
- **THEN** the CLI displays shell completion installation commands

---

### Requirement: Enhanced Output Formatting
The CLI SHALL use visual formatting for better user experience.

#### Scenario: Progress spinners
- **WHEN** performing long-running operations (worktree create, PR operations)
- **THEN** the CLI displays animated progress spinners

#### Scenario: Colorized output
- **WHEN** displaying status information
- **THEN** the CLI uses colors: green (success), yellow (warning), red (error), cyan (info)

#### Scenario: Task progress display
- **WHEN** listing changes with tasks
- **THEN** the CLI shows `4/7 tasks (57%)` format

---

### Requirement: JSON Output Support
The CLI SHALL support `--json` flag on applicable commands.

#### Scenario: Status JSON output
- **WHEN** user runs `speclife status --json`
- **THEN** the CLI outputs structured JSON instead of human-readable text

#### Scenario: List JSON output
- **WHEN** user runs `speclife list --json`
- **THEN** the CLI outputs an array of change objects as JSON

---

### Requirement: Non-Interactive Mode
The CLI SHALL support `--no-interactive` and `--yes` flags.

#### Scenario: Skip confirmation prompts
- **WHEN** user runs a command with `--yes`
- **THEN** the CLI skips confirmation prompts and proceeds

#### Scenario: CI-safe operation
- **WHEN** running with `--no-interactive`
- **THEN** the CLI never blocks waiting for user input

#### Scenario: Fail without input
- **WHEN** `--no-interactive` is set and input is required
- **THEN** the CLI exits with error explaining missing arguments

