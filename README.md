# SpecLife

**Git and GitHub automation for spec-driven development.**

SpecLife complements [OpenSpec](https://github.com/malarbase/openspec) by automating git/GitHub workflows. While OpenSpec manages specs (proposals, validation, implementation guidance), SpecLife handles worktrees, branches, PRs, merging, and releases.

## Quick Start

```bash
# Install CLI
npm install -g @speclife/cli

# Initialize your project
speclife init

# The AI does the rest via slash commands:
/speclife start "Add user authentication"   # Creates worktree + branch
/openspec-apply                              # Implement (via OpenSpec)
/speclife ship                               # Commit, push, create PR
/speclife land                               # Merge, cleanup, auto-release
```

## How It Works

SpecLife uses **slash commands** that guide AI assistants through git/GitHub operations:

```
You: /speclife start "Add OAuth authentication"
AI: Creating worktree for oauth-auth...
    → Created worktree: ./worktrees/oauth-auth/
    → Created branch: spec/oauth-auth
    → Run /openspec-proposal to create the spec

You: [define proposal in proposal.md]

You: /openspec-apply
AI: [implements tasks, runs tests]

You: /speclife ship
AI: Validating spec... ✓
    → Archived spec to openspec/changes/archive/
    → Committed: "feat: add OAuth authentication"
    → Pushed to origin/spec/oauth-auth
    → Created PR #42: https://github.com/you/repo/pull/42

You: /speclife land
AI: → Merged PR #42 (squash)
    → Synced main with latest changes
    → Removed worktree ./worktrees/oauth-auth/
    
    📊 Release Analysis
    Suggested bump: minor (0.1.7 → 0.2.0)
    
    ✨ Auto-release enabled. Creating release PR...
    → Created release PR #43
    🤖 Auto-merge enabled - will merge when CI passes
```

## Slash Commands

| Command | Purpose | GitHub Operations |
|---------|---------|-------------------|
| `/speclife setup` | AI-guided discovery to populate `openspec/speclife.md` | — |
| `/speclife start` | Create worktree + branch, optionally scaffold proposal | — |
| `/speclife ship` | Archive spec, commit, push, create PR | Via @github MCP or `gh` CLI |
| `/speclife land` | Merge PR, cleanup worktree, auto-release | Via @github MCP or `gh` CLI |
| `/speclife release` | Manual release (for major versions) | Via @github MCP or `gh` CLI |

**Note:** For implementation, use `/openspec-apply` directly. SpecLife focuses on git/GitHub automation.

## CLI Commands

```bash
speclife init                        # Configure project for AI editors
speclife worktree create <change-id> # Create worktree + branch
speclife worktree rm <change-id>     # Remove worktree + branch
speclife worktree list               # List active worktrees
speclife status [change-id]          # Show change status
speclife version                     # Show version
```

## Installation

### Option A: npm (Recommended)

```bash
npm install -g @speclife/cli
speclife init
```

### Option B: From Source

```bash
git clone https://github.com/malarbase/speclife.git
cd speclife
npm install && npm run build
npm link -w packages/cli
```

## Project Setup

Run `speclife init` in your project root:

```bash
$ speclife init

Detecting project settings...
✓ Found openspec/ directory
✓ Detected git base branch: main

Configuring editors:
  ✓ Cursor      → .cursor/commands/speclife/
  ✓ Claude Code → .claude/commands/speclife/

✓ Created .specliferc.yaml (minimal)
✓ Created openspec/commands/speclife/*.md (tracked)
✓ Created openspec/speclife.md (template)
✓ Created .github/workflows/speclife-release.yml

⚠️  Run /speclife setup to auto-detect project commands
```

Then run `/speclife setup` in your AI editor to auto-detect project commands.

## Configuration

### `.specliferc.yaml` (minimal CLI config)

```yaml
specDir: openspec

git:
  baseBranch: main
  branchPrefix: spec/
  worktreeDir: worktrees
```

### `openspec/speclife.md` (AI context)

```markdown
# SpecLife Configuration

## Commands
- **Test:** `npm test`
- **Build:** `npm run build`
- **Lint:** `npm run lint`

## Release Policy
- **Auto-release:** patch and minor versions
- **Manual release:** major versions (breaking changes)

## Context Files
When implementing changes, always read:
- `openspec/project.md` - project context and conventions
- `openspec/AGENTS.md` - agent guidelines
```

## Worktrees

SpecLife uses git worktrees to keep `main` clean and enable parallel development:

```
./                              ← main worktree (stays on main, clean)
./worktrees/add-auth/           ← worktree for add-auth
./worktrees/fix-performance/    ← worktree for fix-performance
```

Benefits:
- Main worktree stays on `main` branch
- Work on multiple changes in parallel
- No branch switching in main directory

## Release Flow

After `/speclife land`:

1. Analyzes commits since last tag
2. Suggests version bump (patch/minor/major)
3. For patch/minor: auto-creates release PR with auto-merge
4. For major: prompts for `/speclife release --major`
5. When release PR merges → GitHub Actions creates tag + release

## Integration with OpenSpec

| Tool | Responsibility |
|------|----------------|
| **OpenSpec** | Spec management (proposals, validation, implementation guidance, archiving) |
| **SpecLife** | Git/GitHub automation (worktrees, branches, PRs, merging, releases) |

SpecLife commands internally use OpenSpec for spec-related operations:
- `/speclife ship` calls `openspec validate` and `openspec archive`
- `/speclife start` can invoke `/openspec-proposal` for scaffolding

## MCP Server (Deprecated)

The MCP server (`@speclife/mcp-server`) is deprecated in favor of slash commands. It remains available for:
- CI/automation scenarios
- Editors without slash command support

Migration: Replace `speclife_*` tool calls with equivalent `/speclife` slash commands.

```bash
# Old (MCP tool)
speclife_init --changeId add-auth

# New (slash command)
/speclife start "Add authentication"
```

## Requirements

- Node.js >= 20.x
- Git
- Project with OpenSpec structure
- AI editor with slash commands (Cursor, Claude Code)

For GitHub operations, one of:
- @github MCP configured in your editor
- `gh` CLI installed and authenticated

## Project Structure

```
speclife/
├── packages/
│   ├── core/           # Shared business logic
│   ├── mcp-server/     # MCP server (deprecated)
│   └── cli/            # CLI for git operations
├── openspec/           # Specifications
│   ├── project.md
│   ├── speclife.md     # AI context for slash commands
│   ├── commands/       # Tracked slash commands
│   │   └── speclife/
│   │       ├── setup.md
│   │       ├── start.md
│   │       ├── ship.md
│   │       ├── land.md
│   │       └── release.md
│   └── specs/
└── package.json
```

## Development

```bash
npm run build        # Build all packages
npm test             # Run tests
npm run typecheck    # TypeScript validation
```

## License

Copyright (C) 2026 malarbase

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See [LICENSE](LICENSE) for the full license text.
