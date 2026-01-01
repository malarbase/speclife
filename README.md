# SpecLife

**Bring specifications to life.**

SpecLife is an MCP server that automates spec-driven development workflows. Instead of learning CLI commands, developers talk to their AI assistant (Claude, Cursor), which orchestrates the entire flow from change proposal to merged PR.

## How It Works

```
You: "Create a change to add user authentication"
AI: [calls speclife_init] ✓ Created worktree at ./worktrees/add-user-auth/
    Scaffolded proposal at worktrees/add-user-auth/openspec/changes/add-user-auth/

You: "Here's what I want: OAuth2 with Google and GitHub providers"
AI: [updates proposal.md and tasks.md]
    Ready to implement. Should I start?

You: "Yes, implement it"
AI: [calls speclife_implement]
    Reading specs and codebase context...
    Implementing task 1.1: Add OAuth configuration...
    ✓ Created src/auth/oauth-config.ts
    ✓ Modified src/routes/auth.ts
    Running tests... 2 failures
    Analyzing failures and fixing...
    Running tests... ✓ All 15 tests passing

You: "Ship it"
AI: [calls speclife_submit]
    ✓ Committed: "feat: add OAuth2 authentication"
    ✓ Pushed to origin/spec/add-user-auth
    ✓ PR #42 created: https://github.com/you/repo/pull/42
    ✓ Archived change to openspec/changes/archive/

You: "Merge when CI passes"
AI: [calls speclife_merge]
    ✓ PR #42 merged (squash)
    ✓ Switched to main branch
    ✓ Pulled latest changes
    Ready for next spec!
```

## Features

- **MCP-Native**: Primary interface is AI assistants (Claude Desktop, Cursor)
- **OpenSpec Compatible**: Works with any project using OpenSpec conventions
- **Full Lifecycle**: Init → Implement → Test → Submit → Merge
- **AI-Powered Implementation**: Claude generates code from specs
- **Git + GitHub Integration**: Branch management, PR creation, merging

## Installation

```bash
# Clone and install
git clone https://github.com/malarbase/speclife.git
cd speclife
npm install

# Build
npm run build
```

## Setup with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

## Setup with Cursor

Add to your workspace's MCP configuration:

```json
{
  "speclife": {
    "command": "node",
    "args": ["./speclife/packages/mcp-server/dist/index.js"]
  }
}
```

## Configuration

Create `.specliferc.yaml` in your project root:

```yaml
specDir: openspec
aiProvider: claude
aiModel: claude-sonnet-4-20250514

github:
  owner: your-username
  repo: your-repo
  baseBranch: main

testCommand: npm test
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `speclife_init` | Create worktree and scaffold change proposal (worktree is default) |
| `speclife_status` | Show current change state and progress |
| `speclife_list` | List all active changes across worktrees |
| `speclife_implement` | AI-driven implementation with internal test loop (implement → test → fix → repeat) |
| `speclife_submit` | Commit, push, create PR, and archive the change |
| `speclife_merge` | Merge PR on GitHub, cleanup worktree, ready for next cycle |

## Workflow

```
┌─────────────┐     ┌─────────────────────────────────────┐     ┌──────────────┐     ┌─────────────┐
│ speclife_   │     │         speclife_implement          │     │  speclife_   │     │  speclife_  │
│    init     │ ──▶ │  ┌─────────────────────────────┐   │ ──▶ │    submit    │ ──▶ │    merge    │
│             │     │  │ implement → test → fix loop │   │     │              │     │             │
└─────────────┘     │  └─────────────────────────────┘   │     └──────────────┘     └─────────────┘
                    └─────────────────────────────────────┘
  Creates branch      AI implements code, runs tests,        Commits, pushes,      Merges PR,
  + scaffolds         fixes failures until passing           creates PR,           switches to main
  proposal                                                   archives change       for next cycle
```

## Worktrees (Default Behavior)

SpecLife uses git worktrees by default, keeping `main` clean and enabling parallel development:

```bash
# Each init creates a new worktree (default)
speclife_init --changeId add-auth
speclife_init --changeId fix-performance

# Directory structure:
# ./                           ← main worktree (stays on main branch, clean)
# ./worktrees/add-auth/        ← worktree for add-auth
# ./worktrees/fix-performance/ ← worktree for fix-performance
```

**Benefits:**
- Main worktree stays on `main` branch, always clean
- Multiple changes can be worked on in parallel
- AI can implement different specs simultaneously
- No branch switching needed in main directory

**Opt-out:** Use `--no-worktree` to create a branch in the current worktree instead:
```bash
speclife_init --changeId quick-fix --no-worktree
```

## CLI (for CI/Scripts)

```bash
# Install globally
npm install -g @speclife/cli

# Use in CI
speclife submit add-feature --yes
speclife merge add-feature --squash
```

## Requirements

- Node.js >= 20.x
- Git
- Project with OpenSpec structure
- `GITHUB_TOKEN` environment variable
- `ANTHROPIC_API_KEY` environment variable (for AI features)

## Project Structure

```
speclife/
├── packages/
│   ├── core/           # Shared business logic
│   ├── mcp-server/     # MCP server (primary interface)
│   └── cli/            # CLI wrapper (for CI)
├── openspec/           # Specifications
│   ├── project.md      # Project context
│   └── specs/          # Requirements
└── package.json        # Workspace root
```

## Development

```bash
# Build all packages
npm run build

# Run tests
npm test

# Start MCP server (for testing)
npm run mcp:start

# Development mode (watch + restart)
npm run mcp:dev
```

## License

MIT

