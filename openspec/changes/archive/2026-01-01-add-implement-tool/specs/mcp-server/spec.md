# MCP Server Spec Delta

## MODIFIED Requirements

### Requirement: Implement Tool
The MCP server SHALL provide a `speclife_implement` tool for code implementation with multiple execution modes.

**Parameters:**
- `changeId` (required): The change to implement
- `mode` (optional): Implementation mode - `claude-cli` | `claude-sdk` | `cursor` (default: from config or `claude-cli`)
- `taskId` (optional): Specific task to implement (e.g., "1.2")
- `dryRun` (optional): Return plan without executing

---

## ADDED Requirements

### Requirement: Claude CLI Mode
The implement tool SHALL support `claude-cli` mode as the primary implementation method.

#### Scenario: Implement with Claude CLI (default)
- **WHEN** AI invokes `speclife_implement` with `changeId: "add-feature"` and `mode: "claude-cli"`
- **THEN** generate an implementation prompt from proposal, tasks, and context
- **AND** invoke the `claude` CLI with working directory set to the worktree
- **AND** stream output from the Claude CLI session
- **AND** return session output and any detected task completions

#### Scenario: Claude CLI not available
- **WHEN** AI invokes `speclife_implement` with `mode: "claude-cli"`
- **AND** the `claude` CLI is not installed or not in PATH
- **THEN** return error "Claude CLI not found. Install from https://docs.anthropic.com/claude-cli or use mode: claude-sdk"

---

### Requirement: Claude SDK Mode
The implement tool SHALL support `claude-sdk` mode for fully automated implementation.

#### Scenario: Implement with Claude SDK
- **WHEN** AI invokes `speclife_implement` with `changeId: "add-feature"` and `mode: "claude-sdk"`
- **THEN** read proposal.md, tasks.md, and design.md (if exists)
- **AND** gather relevant codebase context based on affected files
- **AND** for each uncompleted task:
  1. Implement the task using Anthropic SDK with tool-use
  2. Run tests (config.testCommand)
  3. If tests fail, analyze and fix (up to 3 iterations)
  4. Mark task complete when tests pass
- **AND** return summary of changes made and test results

#### Scenario: Test loop exhausted (claude-sdk)
- **WHEN** AI invokes `speclife_implement` with `mode: "claude-sdk"`
- **AND** tests still fail after 3 fix iterations
- **THEN** return partial progress with failing test details
- **AND** mark task as incomplete

#### Scenario: Missing API key (claude-sdk)
- **WHEN** AI invokes `speclife_implement` with `mode: "claude-sdk"`
- **AND** `ANTHROPIC_API_KEY` is not set
- **THEN** return error "ANTHROPIC_API_KEY environment variable required for claude-sdk mode"

---

### Requirement: Cursor Mode
The implement tool SHALL support `cursor` mode to open Cursor IDE for manual implementation.

#### Scenario: Implement with Cursor
- **WHEN** AI invokes `speclife_implement` with `changeId: "add-feature"` and `mode: "cursor"`
- **THEN** open Cursor IDE with the worktree directory
- **AND** return message indicating Cursor was opened and user should implement manually

#### Scenario: Cursor not available
- **WHEN** AI invokes `speclife_implement` with `mode: "cursor"`
- **AND** the `cursor` CLI is not installed or not in PATH
- **THEN** return error "Cursor CLI not found. Install Cursor and ensure 'cursor' command is available"

---

## MODIFIED Scenarios

### Requirement: Implement Tool (existing scenarios - now apply to claude-sdk mode)

#### Scenario: Implement specific task
- **WHEN** AI invokes `speclife_implement` with `changeId`, `taskId: "1.2"`, and `mode: "claude-sdk"` or `mode: "claude-cli"`
- **THEN** implement only the specified task

#### Scenario: Dry run
- **WHEN** AI invokes `speclife_implement` with `dryRun: true`
- **THEN** return planned prompt/actions without executing
- **AND** for `claude-cli`: return the generated prompt
- **AND** for `claude-sdk`: return the planned tool calls
- **AND** for `cursor`: return the path that would be opened

