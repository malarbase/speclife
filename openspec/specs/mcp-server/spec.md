# MCP Server Specification

## Overview
The SpecLife MCP server exposes tools that AI assistants can invoke to automate spec-driven development workflows.

---

### Requirement: Server Initialization
The MCP server SHALL initialize with proper metadata and register all tools.

#### Scenario: Server starts successfully
- **WHEN** the MCP server starts
- **THEN** it registers with name "speclife" and current version
- **AND** all tools are available for invocation

#### Scenario: Configuration loaded
- **WHEN** the MCP server starts
- **THEN** it loads configuration from `.specliferc.yaml` or defaults
- **AND** validates required environment variables

---

### Requirement: Init Tool
The MCP server SHALL provide a `speclife_init` tool to create new change proposals using worktrees by default.

#### Scenario: Initialize new change (default: worktree)
- **WHEN** AI invokes `speclife_init` with `changeId: "add-feature"`
- **THEN** create a git worktree at `worktrees/add-feature/`
- **AND** create branch `spec/add-feature` in that worktree
- **AND** scaffold `openspec/changes/add-feature/` in the worktree
- **AND** scaffold `proposal.md` with template content
- **AND** scaffold `tasks.md` with empty checklist
- **AND** return worktree path and created file paths

#### Scenario: Initialize with description
- **WHEN** AI invokes `speclife_init` with `changeId` and `description`
- **THEN** populate proposal.md "Why" section with the description

#### Scenario: Initialize without worktree (opt-out)
- **WHEN** AI invokes `speclife_init` with `changeId` and `noWorktree: true`
- **THEN** create branch `spec/{changeId}` in the current worktree
- **AND** checkout the new branch
- **AND** scaffold proposal files in the current directory

#### Scenario: Change already exists
- **WHEN** AI invokes `speclife_init` with existing `changeId`
- **THEN** return error with message "Change 'add-feature' already exists"

#### Scenario: Invalid change ID format
- **WHEN** AI invokes `speclife_init` with non-kebab-case `changeId`
- **THEN** return error with message explaining valid format

---

### Requirement: Status Tool
The MCP server SHALL provide a `speclife_status` tool to show change state.

#### Scenario: Show specific change status
- **WHEN** AI invokes `speclife_status` with `changeId: "add-feature"`
- **THEN** return change metadata (branch, created date)
- **AND** return proposal summary
- **AND** return task completion status (e.g., "3/5 tasks complete")
- **AND** return current workflow state (CREATED, IMPLEMENTING, etc.)

#### Scenario: Show current branch change
- **WHEN** AI invokes `speclife_status` without `changeId`
- **AND** current branch is `spec/add-feature`
- **THEN** return status for `add-feature` change

#### Scenario: No active change
- **WHEN** AI invokes `speclife_status` without `changeId`
- **AND** current branch is not a spec branch
- **THEN** return message "No active change on current branch"

---

### Requirement: List Tool
The MCP server SHALL provide a `speclife_list` tool to enumerate active changes.

#### Scenario: List all changes
- **WHEN** AI invokes `speclife_list`
- **THEN** return list of all changes in `openspec/changes/` (excluding archive)
- **AND** include changeId, status, and branch for each

#### Scenario: No active changes
- **WHEN** AI invokes `speclife_list`
- **AND** no changes exist
- **THEN** return message "No active changes"

---

### Requirement: Implement Tool
The MCP server SHALL provide a `speclife_implement` tool for AI-driven code implementation with an internal test loop.

#### Scenario: Implement with test loop
- **WHEN** AI invokes `speclife_implement` with `changeId: "add-feature"`
- **THEN** read proposal.md, tasks.md, and design.md (if exists)
- **AND** gather relevant codebase context based on affected files
- **AND** for each uncompleted task:
  1. Implement the task using AI
  2. Run tests
  3. If tests fail, analyze and fix (up to 3 iterations)
  4. Mark task complete when tests pass
- **AND** return summary of changes made and test results

#### Scenario: Implement specific task
- **WHEN** AI invokes `speclife_implement` with `changeId` and `taskId: "1.2"`
- **THEN** implement only the specified task with test loop

#### Scenario: Dry run
- **WHEN** AI invokes `speclife_implement` with `dryRun: true`
- **THEN** return planned changes without modifying files

#### Scenario: Test loop exhausted
- **WHEN** AI invokes `speclife_implement`
- **AND** tests still fail after 3 fix iterations
- **THEN** return partial progress with failing test details
- **AND** mark task as incomplete

#### Scenario: Implementation fails
- **WHEN** AI invokes `speclife_implement`
- **AND** implementation encounters an error
- **THEN** return error with context and partial progress
- **AND** do not leave filesystem in inconsistent state

---

### Requirement: Submit Tool
The MCP server SHALL provide a `speclife_submit` tool to create pull requests and archive the change.

#### Scenario: Submit change
- **WHEN** AI invokes `speclife_submit` with `changeId: "add-feature"`
- **THEN** stage all changes with git add
- **AND** commit with message based on proposal title
- **AND** push to remote branch
- **AND** create pull request on GitHub with proposal as body
- **AND** archive the change (move to `openspec/changes/archive/YYYY-MM-DD-{changeId}/`)
- **AND** commit and push the archive
- **AND** return PR URL

#### Scenario: Submit as draft
- **WHEN** AI invokes `speclife_submit` with `draft: true`
- **THEN** create PR as draft (still archives the change)

#### Scenario: Nothing to commit
- **WHEN** AI invokes `speclife_submit`
- **AND** no changes staged or unstaged
- **THEN** return error "No changes to submit"

#### Scenario: PR already exists
- **WHEN** AI invokes `speclife_submit`
- **AND** PR already exists for branch
- **THEN** push any new changes
- **AND** archive the change if not already archived
- **AND** return existing PR URL

---

### Requirement: Merge Tool
The MCP server SHALL provide a `speclife_merge` tool to merge the PR and prepare for the next cycle.

#### Scenario: Merge and switch to main
- **WHEN** AI invokes `speclife_merge` with `changeId: "add-feature"`
- **THEN** merge the PR on GitHub (if approved and CI passes)
- **AND** checkout base branch (main) locally
- **AND** pull latest changes
- **AND** delete local feature branch
- **AND** if using worktree, remove the worktree
- **AND** return success message indicating ready for next spec

#### Scenario: Squash merge
- **WHEN** AI invokes `speclife_merge` with `squash: true`
- **THEN** perform squash merge on GitHub

#### Scenario: PR not ready
- **WHEN** AI invokes `speclife_merge`
- **AND** PR has failing checks or pending reviews
- **THEN** return error with PR status details

#### Scenario: Worktree cleanup
- **WHEN** AI invokes `speclife_merge`
- **AND** change was created with worktree
- **THEN** remove the worktree directory after merge
- **AND** prune worktree references

---

### Requirement: Error Handling
The MCP server SHALL provide consistent error responses.

#### Scenario: Tool error response
- **WHEN** any tool encounters an error
- **THEN** return structured error with `code`, `message`, and relevant `context`
- **AND** error message is actionable (suggests resolution)

#### Scenario: Missing configuration
- **WHEN** tool requires GitHub operations
- **AND** `GITHUB_TOKEN` is not set
- **THEN** return error "GITHUB_TOKEN environment variable required"

#### Scenario: Missing AI configuration
- **WHEN** tool requires AI operations
- **AND** AI API key is not set
- **THEN** return error specifying which key is needed based on configured provider

