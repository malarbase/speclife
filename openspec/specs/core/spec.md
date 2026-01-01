# Core Library Specification

## Overview
The core library provides shared business logic, adapters, and workflows used by both the MCP server and CLI.

---

### Requirement: Configuration Loading
The core library SHALL load configuration from standard locations.

#### Scenario: Load from .specliferc.yaml
- **WHEN** configuration is requested
- **AND** `.specliferc.yaml` exists in project root
- **THEN** load and parse YAML configuration

#### Scenario: Load from package.json
- **WHEN** configuration is requested
- **AND** no `.specliferc.*` file exists
- **AND** `package.json` contains `speclife` key
- **THEN** load configuration from package.json

#### Scenario: Environment variable overrides
- **WHEN** configuration is loaded
- **AND** `SPECLIFE_AI_PROVIDER` environment variable is set
- **THEN** override `aiProvider` config with environment value

#### Scenario: Default configuration
- **WHEN** no configuration file exists
- **THEN** use sensible defaults (specDir: "openspec", baseBranch: "main")

#### Scenario: Invalid configuration
- **WHEN** configuration file has invalid values
- **THEN** throw ConfigError with specific field and expected format

---

### Requirement: Git Adapter
The core library SHALL provide a Git adapter for repository operations.

#### Scenario: Create branch
- **WHEN** `createBranch("spec/add-feature", "main")` is called
- **THEN** create new branch from specified base
- **AND** checkout the new branch

#### Scenario: Get current branch
- **WHEN** `getCurrentBranch()` is called
- **THEN** return current branch name

#### Scenario: Stage and commit
- **WHEN** `add(["."])` then `commit("message")` is called
- **THEN** stage all changes and create commit
- **AND** return commit SHA

#### Scenario: Push to remote
- **WHEN** `push("origin", "spec/add-feature")` is called
- **THEN** push branch to remote
- **AND** set upstream tracking

#### Scenario: Get status
- **WHEN** `status()` is called
- **THEN** return object with staged, unstaged, and untracked files

---

### Requirement: GitHub Adapter
The core library SHALL provide a GitHub adapter for API operations.

#### Scenario: Create pull request
- **WHEN** `createPullRequest({ title, body, head, base })` is called
- **THEN** create PR on GitHub
- **AND** return PR number and URL

#### Scenario: Get pull request
- **WHEN** `getPullRequest({ branch })` is called
- **THEN** return PR details if exists, null otherwise

#### Scenario: Merge pull request
- **WHEN** `mergePullRequest({ number, method })` is called
- **THEN** merge PR with specified method (merge, squash, rebase)

#### Scenario: Check PR status
- **WHEN** `getPullRequestStatus({ number })` is called
- **THEN** return mergeable state, check status, and review status

#### Scenario: Missing token
- **WHEN** any GitHub operation is called
- **AND** `GITHUB_TOKEN` is not set
- **THEN** throw GitHubError with code "MISSING_TOKEN"

---

### Requirement: AI Adapter
The core library SHALL provide an AI adapter for code generation.

#### Scenario: Claude provider
- **WHEN** AI adapter is created with `provider: "claude"`
- **THEN** use Anthropic SDK for API calls

#### Scenario: Tool-use conversation
- **WHEN** `runAgentLoop({ systemPrompt, userMessage, tools })` is called
- **THEN** execute agentic loop with tool use
- **AND** return final response and all tool invocations

#### Scenario: Execute tool
- **WHEN** AI requests tool execution
- **THEN** execute tool handler and return result
- **AND** continue conversation with tool result

#### Scenario: Max iterations
- **WHEN** agent loop exceeds 50 iterations
- **THEN** terminate with error "Max iterations exceeded"

#### Scenario: Missing API key
- **WHEN** AI operation is called
- **AND** appropriate API key is not set
- **THEN** throw AIError with code "MISSING_API_KEY"

---

### Requirement: OpenSpec Adapter
The core library SHALL provide an OpenSpec adapter for spec operations.

#### Scenario: Scaffold change
- **WHEN** `scaffoldChange(changeId, { description })` is called
- **THEN** create directory `openspec/changes/{changeId}/`
- **AND** create `proposal.md` with template
- **AND** create `tasks.md` with empty checklist

#### Scenario: Read change
- **WHEN** `readChange(changeId)` is called
- **THEN** return parsed proposal, tasks, and design (if exists)

#### Scenario: List changes
- **WHEN** `listChanges()` is called
- **THEN** return array of change IDs from `openspec/changes/`
- **AND** exclude `archive/` directory

#### Scenario: Archive change
- **WHEN** `archiveChange(changeId)` is called
- **THEN** move change to `openspec/changes/archive/YYYY-MM-DD-{changeId}/`

#### Scenario: Validate change
- **WHEN** `validateChange(changeId)` is called
- **THEN** return validation result with any errors

---

### Requirement: Init Workflow
The core library SHALL provide an init workflow for creating changes.

#### Scenario: Full initialization
- **WHEN** `initWorkflow({ changeId, description })` is called
- **THEN** create branch `spec/{changeId}`
- **AND** scaffold change directory with proposal and tasks
- **AND** return paths to created files

#### Scenario: Skip branch
- **WHEN** `initWorkflow({ changeId, skipBranch: true })` is called
- **THEN** scaffold files without creating branch

#### Scenario: Dry run
- **WHEN** `initWorkflow({ changeId, dryRun: true })` is called
- **THEN** return what would be created without making changes

#### Scenario: Duplicate change
- **WHEN** `initWorkflow({ changeId })` is called
- **AND** change already exists
- **THEN** throw WorkflowError with code "CHANGE_EXISTS"

---

### Requirement: Implement Workflow
The core library SHALL provide an implement workflow for AI-driven code generation.

#### Scenario: Read context
- **WHEN** `implementWorkflow({ changeId })` starts
- **THEN** read proposal.md, tasks.md, design.md
- **AND** identify affected files from spec references
- **AND** gather codebase context (project.md, referenced files)

#### Scenario: Execute implementation
- **WHEN** implementation proceeds
- **THEN** invoke AI with gathered context and tools
- **AND** AI uses read_file, write_file, search_codebase tools
- **AND** apply all file changes atomically

#### Scenario: Task filtering
- **WHEN** `implementWorkflow({ changeId, taskId: "1.2" })` is called
- **THEN** only implement the specified task

#### Scenario: Progress events
- **WHEN** implementation is running
- **THEN** emit progress events (task_started, file_written, task_completed)

---

### Requirement: Submit Workflow
The core library SHALL provide a submit workflow for creating PRs.

#### Scenario: Full submission
- **WHEN** `submitWorkflow({ changeId })` is called
- **THEN** stage all changes
- **AND** commit with message from proposal title
- **AND** push to remote
- **AND** create PR with proposal as body
- **AND** return PR URL

#### Scenario: Existing PR
- **WHEN** `submitWorkflow({ changeId })` is called
- **AND** PR already exists for branch
- **THEN** push changes and return existing PR URL

#### Scenario: No changes
- **WHEN** `submitWorkflow({ changeId })` is called
- **AND** git status shows no changes
- **THEN** throw WorkflowError with code "NO_CHANGES"

---

### Requirement: Merge Workflow
The core library SHALL provide a merge workflow for completing changes.

#### Scenario: Full merge
- **WHEN** `mergeWorkflow({ changeId })` is called
- **THEN** merge PR on GitHub
- **AND** archive change
- **AND** checkout base branch
- **AND** pull latest

#### Scenario: PR not mergeable
- **WHEN** `mergeWorkflow({ changeId })` is called
- **AND** PR has failing checks
- **THEN** throw WorkflowError with PR status details

---

### Requirement: Structured Errors
The core library SHALL use structured errors throughout.

#### Scenario: Error structure
- **WHEN** any error is thrown
- **THEN** error includes `code` (string identifier)
- **AND** error includes `message` (human-readable)
- **AND** error includes `context` (relevant data)

#### Scenario: Error codes
- **THEN** use consistent error codes:
  - `CONFIG_INVALID` - Configuration error
  - `CHANGE_EXISTS` - Change already exists
  - `CHANGE_NOT_FOUND` - Change doesn't exist
  - `BRANCH_EXISTS` - Git branch already exists
  - `NO_CHANGES` - Nothing to commit
  - `GITHUB_ERROR` - GitHub API error
  - `AI_ERROR` - AI provider error
  - `MISSING_TOKEN` - Required credential missing

