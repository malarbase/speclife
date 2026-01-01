# Project Context

## Purpose
SpecLife brings specifications to life. It's an MCP server (with optional CLI) that automates spec-driven development—from change proposal to merged PR—using AI assistants as the primary interface.

**Philosophy:** Instead of learning CLI commands, developers talk to their AI assistant, which orchestrates SpecLife tools behind the scenes.

**Demo Workflow:**
```
User: "Create a change to add user authentication"
AI: [calls speclife_init] ✓ Created branch spec/add-user-auth

User: "Implement it"
AI: [calls speclife_implement] [reads specs, writes code, runs tests]

User: "Ship it"
AI: [calls speclife_submit] PR #42 created
```

## Tech Stack
- **Language:** TypeScript (strict mode, ESM)
- **Runtime:** Node.js >= 20.x
- **Primary Interface:** MCP Server (@modelcontextprotocol/sdk)
- **Secondary Interface:** CLI (Commander.js) for CI/scripting
- **AI Integration:** Anthropic Claude API (@anthropic-ai/sdk) for implementation logic
- **Git Operations:** simple-git
- **GitHub API:** Octokit (@octokit/rest)
- **Process Runner:** execa
- **Config:** cosmiconfig
- **Testing:** Vitest

## Package Structure
```
speclife/
├── packages/
│   ├── core/              # Shared business logic (the brain)
│   │   ├── src/
│   │   │   ├── adapters/  # Git, GitHub, AI, OpenSpec wrappers
│   │   │   ├── workflows/ # init, implement, test, submit, merge
│   │   │   ├── config.ts  # Configuration loading
│   │   │   └── types.ts   # Shared TypeScript types
│   │   └── package.json
│   ├── mcp-server/        # MCP server (primary interface)
│   │   ├── src/
│   │   │   ├── tools/     # Tool definitions
│   │   │   └── index.ts   # Server entry point
│   │   └── package.json
│   └── cli/               # Thin CLI wrapper (for CI/scripts)
│       ├── src/
│       │   └── index.ts   # CLI entry point
│       └── package.json
├── package.json           # Workspace root
├── tsconfig.json          # Base TypeScript config
└── openspec/              # Specifications
```

## Project Conventions

### Code Style
- TypeScript strict mode with `noUnusedLocals`, `noImplicitReturns`
- File names: kebab-case (e.g., `git-adapter.ts`)
- Types/Interfaces: PascalCase (e.g., `ChangeContext`, `SpecLifeConfig`)
- Functions/Variables: camelCase
- Use `.js` extensions in imports (TypeScript NodeNext resolution)
- Prefer `async/await` over raw Promises

### Architecture Patterns
- **Adapter Pattern:** Wrap external services (Git, GitHub, AI) in adapters for testability
- **Workflow Pattern:** Each operation (init, implement, etc.) is a composable workflow
- **Configuration-driven:** All behavior configurable via `.specliferc.yaml`
- **Agentic Loop:** AI implementation uses tool-use pattern with iterative refinement

### Testing Strategy
- Unit tests for adapters and utilities (mock external services)
- Integration tests for workflows (use real git in temp repos)
- MCP tool tests (verify tool schemas and basic invocation)

### Error Handling
- All operations support `dryRun` option for safe preview
- Rollback on failure (stash changes, reset branch)
- Structured errors with `code`, `message`, and `context`
- Progress events emitted for long-running operations

## Domain Context

### Core Concepts
- **Change:** A unit of work defined by OpenSpec proposal (proposal.md, tasks.md, design.md)
- **Workflow:** A composable operation (init, implement, test, submit, merge)
- **Pipeline:** The full automation flow executing workflows in sequence
- **Adapter:** Abstraction layer for external services (Git, GitHub, AI providers)
- **Tool:** An MCP-exposed function that AI assistants can invoke

### Change Lifecycle States
```
┌─────────┐    ┌──────────────────────────────────┐    ┌──────────┐    ┌────────┐
│ CREATED │ -> │          IMPLEMENTING            │ -> │ SUBMITTED│ -> │ MERGED │
└─────────┘    │  (includes internal test loop)   │    └──────────┘    └────────┘
     │         └──────────────────────────────────┘          │              │
     v                        v                              v              v
speclife_init          speclife_implement            speclife_submit  speclife_merge
(creates worktree)     (implement → test → fix)      (+ archives)     (+ removes worktree)
```

### MCP Tools Overview

| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `speclife_init` | Create worktree (default) + scaffold proposal | `changeId`, `description?`, `noWorktree?` |
| `speclife_status` | Show current change state | `changeId?` |
| `speclife_list` | List active changes across worktrees | none |
| `speclife_implement` | AI implementation with internal test loop | `changeId`, `taskId?`, `dryRun?` |
| `speclife_submit` | Commit, push, create PR, archive change | `changeId`, `draft?` |
| `speclife_merge` | Merge PR, cleanup worktree | `changeId`, `squash?` |

### Workflow Lifecycle

```
┌─────────────┐     ┌─────────────────────────────────────┐     ┌──────────────┐     ┌─────────────┐
│ speclife_   │     │         speclife_implement          │     │  speclife_   │     │  speclife_  │
│    init     │ ──▶ │  ┌─────────────────────────────┐   │ ──▶ │    submit    │ ──▶ │    merge    │
│             │     │  │ implement → test → fix loop │   │     │              │     │             │
└─────────────┘     │  └─────────────────────────────┘   │     └──────────────┘     └─────────────┘
                    └─────────────────────────────────────┘
  Creates worktree    AI implements code, runs tests,        Commits, pushes,      Merges PR,
  (default) +         fixes failures until passing           creates PR,           removes worktree
  scaffolds                                                  archives change
```

### Worktrees (Default Behavior)

SpecLife uses git worktrees by default, keeping `main` clean and enabling parallel development:

```bash
# Each init creates a new worktree (default behavior)
speclife_init --changeId add-auth
speclife_init --changeId fix-performance

# Results in:
# ./                           ← main worktree (stays on main, always clean)
# ./worktrees/add-auth/        ← worktree for add-auth
# ./worktrees/fix-performance/ ← worktree for fix-performance
```

**Benefits:**
- Main worktree stays on `main` branch, always clean
- Multiple changes can be worked on in parallel by different AI agents
- No branch switching needed
- Clean separation of concerns

**Opt-out:** Use `--no-worktree` to work in current directory:
```bash
speclife_init --changeId quick-fix --no-worktree
```

### Configuration File Format
```yaml
# .specliferc.yaml
specDir: openspec              # OpenSpec directory location
aiProvider: claude             # AI provider (claude, openai, gemini)
aiModel: claude-sonnet-4-20250514  # Model to use for implementation

github:
  owner: your-username         # GitHub repo owner
  repo: your-repo              # GitHub repo name
  baseBranch: main             # Base branch for PRs

testCommand: npm test          # Command to run tests
buildCommand: npm run build    # Optional build command

# Files always included in AI context
contextFiles:
  - openspec/project.md
  - README.md
```

## Key Constraints
- Must work with any project using OpenSpec conventions
- AI provider must be swappable (Claude, Gemini, OpenAI)
- Never commit/push without explicit user action (via AI confirmation or --yes flag)
- Must handle partial failures gracefully (resumable operations)
- GitHub token required for PR operations (from env: `GITHUB_TOKEN`)
- AI API key required for implementation (from env: `ANTHROPIC_API_KEY`, etc.)

## Development Setup

### Prerequisites
- Node.js 20+ required
- npm 10.x recommended
- Git installed and configured

### Quick Start
```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Start MCP server (for testing with Claude Desktop)
npm run mcp:start
```

### Environment Variables
```bash
export GITHUB_TOKEN=ghp_xxxx           # GitHub personal access token
export ANTHROPIC_API_KEY=sk-ant-xxxx   # Anthropic API key (for Claude)
```

### Testing with Claude Desktop
Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "speclife": {
      "command": "node",
      "args": ["/path/to/speclife/packages/mcp-server/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_xxxx",
        "ANTHROPIC_API_KEY": "sk-ant-xxxx"
      }
    }
  }
}
```

## External Dependencies
- **Anthropic API:** Claude models for AI-driven implementation
- **GitHub API:** Pull request creation, merging, branch management
- **OpenSpec CLI:** Optional, for validation and archiving (falls back to direct file manipulation)

