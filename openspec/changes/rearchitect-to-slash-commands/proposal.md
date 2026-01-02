## Why

The current MCP-based architecture has several friction points:

1. **Token Configuration Burden**: Users must configure `GITHUB_TOKEN` for PR operations, even when their editor already has GitHub MCP configured
2. **Redundant AI Invocation**: `speclife_implement` tries to invoke another AI from within an AI tool call (tool-calling-as-tool is awkward)
3. **Tight Coupling**: Direct Octokit integration means maintaining our own GitHub API wrapper
4. **Environment Complexity**: Requires `GITHUB_TOKEN` + `ANTHROPIC_API_KEY` in addition to editor MCP setup
5. **Duplicates OpenSpec**: `/speclife change` and `/speclife implement` would conflict with existing `/openspec-proposal` and `/openspec-apply` commands

OpenSpec already provides excellent spec-driven development commands. SpecLife should **complement** openspec with git/github automation, not replace it.

## What Changes

### Core Principle: SpecLife Complements OpenSpec

| Tool | Responsibility |
|------|----------------|
| **OpenSpec** | Spec management (proposals, validation, implementation guidance, archiving) |
| **SpecLife** | Git/GitHub automation (worktrees, branches, PRs, merging, releases) |

### New: Slash Commands (Non-Conflicting)

Create slash commands that ADD to openspec, not duplicate it:

| Slash Command | Purpose | Replaces MCP Tool |
|--------------|---------|-------------------|
| `/speclife setup` | AI-guided discovery to populate `openspec/speclife.md` | — |
| `/speclife start` | Create worktree + branch, optionally scaffold proposal via `/openspec-proposal` | `speclife_init` |
| `/speclife ship` | Archive via `/openspec-archive`, commit, push, create PR | `speclife_submit` |
| `/speclife land` | Merge PR, cleanup worktree, auto-release based on policy | `speclife_merge` |
| `/speclife release` | Manual release (for major versions or forcing release) | `speclife_release` |

**NOT creating** (use openspec instead):
- ~~/speclife change~~ → Use `/openspec-proposal`

**Convenience proxy** (supported but not advertised):
- `/speclife implement` → Proxies to `/openspec-apply` for users who expect it

**GitHub operations fallback:** All GitHub operations try @github MCP first, then fall back to `gh` CLI if MCP is unavailable.

### Enhanced: CLI for Git Operations

```bash
speclife init                        # Configure project for AI editors
speclife worktree create <change-id> # Create worktree + branch
speclife worktree rm <change-id>     # Remove worktree + branch
speclife worktree list               # List active worktrees
speclife status [change-id]          # Show change status (branch, PR, etc.)
speclife version                     # Show version
```

### Simplified Configuration: Minimal YAML + `openspec/speclife.md`

**Key insight:** There are two types of configuration:
1. **CLI settings** (machine-parseable) - paths, branch names
2. **AI context** (human-readable) - commands, conventions, policies

Instead of putting everything in one file, we split by audience:

#### Minimal `.specliferc.yaml` (CLI-only settings)

```yaml
# .specliferc.yaml - only what CLI needs
specDir: openspec

git:
  baseBranch: main
  branchPrefix: spec/
  worktreeDir: worktrees
```

Only 7 lines! The CLI auto-detects what it can:
- `specDir`: looks for `openspec/` or `specs/`
- `git.baseBranch`: from `git remote show origin`

#### AI Context in `openspec/speclife.md` (NEW)

A separate file for AI context, **not** modifying user's `project.md`:

```markdown
# SpecLife Configuration

This file provides context for AI agents using speclife slash commands.

## Commands

<!-- Values auto-detected by /speclife setup from package.json, Makefile, Cargo.toml, etc. -->
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
- `README.md` - project overview
```

#### Why Separate Files?

| What | Where | Why |
|------|-------|-----|
| Git paths | `.specliferc.yaml` | CLI needs deterministic values |
| Commands | `openspec/speclife.md` | AI reads and uses contextually |
| Release policy | `openspec/speclife.md` | AI interprets and follows |
| Project docs | `openspec/project.md` | User's docs, untouched by speclife |

**Benefits:**
- **Doesn't modify user's project.md** - clean separation
- AI gets rich markdown context
- CLI config is tiny and stable
- `/speclife setup` has a clear target to populate
- `speclife init` owns `speclife.md` completely

#### Two-Phase Init: CLI + AI

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
✓ Updated AGENTS.md

⚠️  Run /speclife setup to auto-detect project commands
    Or manually edit openspec/speclife.md
```

**Note:** Slash commands are stored in `openspec/commands/speclife/` (version-controlled) so they're available in all branches and worktrees. Editor-specific directories (`.cursor/commands/`, `.claude/commands/`) are configured to reference these tracked files.

Then `/speclife setup` guides the agent to:
1. Inspect `package.json` (or Makefile, Cargo.toml, etc.)
2. Detect test/build/lint commands
3. Identify key context files
4. Populate `openspec/speclife.md` with discovered values

### Deprecated: MCP Server

Keep `@speclife/mcp-server` available but mark as deprecated:
- Still useful for CI/automation scenarios
- Still useful for editors without slash command support
- Document migration path to slash commands

### Removed: Adapters

- Remove `github-adapter.ts` (delegate to @github MCP)
- Remove `claude-sdk-adapter.ts` (agent IS the AI)
- Remove `claude-cli-adapter.ts` (agent IS the AI)
- Remove `cursor-adapter.ts` (not needed)

## User Flow: OpenSpec + SpecLife Together

```
# One-time project setup (two phases)
$ speclife init
→ Detects openspec/ directory, git base branch
→ Creates .specliferc.yaml (minimal)
→ Creates openspec/commands/speclife/*.md (tracked)
→ Creates openspec/speclife.md (template with TODOs)
→ Creates .github/workflows/speclife-release.yml
→ Configures .cursor/commands/ and .claude/commands/ (symlinks)
→ Updates AGENTS.md with speclife instructions
→ Prompts: "Run /speclife setup to configure"

/speclife setup
→ Agent inspects package.json, Makefile, etc.
→ Agent detects: npm test, npm run build
→ Agent identifies context files
→ Agent populates openspec/speclife.md

# Starting a new change (with description - preferred)
/speclife start "Add user authentication with OAuth"
→ Agent derives change-id from description: add-user-auth
→ Agent runs: speclife worktree create add-user-auth
→ Creates worktree at worktrees/add-user-auth
→ Creates branch spec/add-user-auth
→ Agent invokes /openspec-proposal with description to scaffold files

# Starting a new change (without description)
/speclife start
→ Agent asks for change-id or description
→ Agent runs: speclife worktree create <change-id>
→ Suggests: "Run /openspec-proposal to create the spec"

# Create proposal manually (if not done via /speclife start)
/openspec-proposal
→ Agent scaffolds proposal.md, tasks.md, specs

# Implement (use existing openspec command)
/openspec-apply
→ Agent implements tasks, runs tests
→ User may commit changes during this phase

# Submit for review (speclife's value-add)
/speclife ship
→ Agent validates with openspec validate
→ Agent invokes /openspec-archive to archive the spec (included in PR)
→ Agent stages and commits all changes (may have prior commits from apply)
→ Agent pushes to remote
→ Agent creates PR via @github MCP or gh CLI

# After PR approval
/speclife land
→ Agent merges PR via @github MCP or gh CLI
→ Agent switches to main and pulls
→ Agent runs: speclife worktree rm add-user-auth
→ Agent checks release policy:
   → If auto-release (patch/minor): creates release PR automatically
   → If manual (major): suggests "/speclife release --major"

Note: Archive is done during /speclife ship so it's included in the PR.
No post-merge archive step needed.

# Manual release (only for major versions or forcing release)
/speclife release --major
→ Agent bumps major version
→ Agent creates release PR with message "chore(release): vX.X.X"
→ When merged: GitHub Actions creates tag + release automatically
```

## Architecture After Change

```
speclife/
├── .specliferc.yaml               # Minimal CLI config
├── .github/
│   └── workflows/
│       └── speclife-release.yml   # Auto-release on merge (NEW)
├── openspec/
│   ├── project.md                 # User's project docs (untouched)
│   ├── speclife.md                # SpecLife AI context (NEW)
│   ├── AGENTS.md
│   ├── commands/                  # Tracked slash commands (NEW)
│   │   └── speclife/
│   │       ├── setup.md           # AI-guided config discovery
│   │       ├── start.md           # Create worktree + branch
│   │       ├── implement.md       # Proxy to /openspec-apply (convenience)
│   │       ├── ship.md            # Archive, commit, push, create PR
│   │       ├── land.md            # Merge, cleanup, auto-release
│   │       └── release.md         # Manual release (major versions)
│   └── specs/
├── .cursor/commands/speclife/     # Symlinks to openspec/commands/speclife/
├── .claude/commands/speclife/     # Symlinks to openspec/commands/speclife/
├── packages/
│   ├── cli/                       # Enhanced CLI
│   │   └── src/index.ts           # init, worktree, status, version
│   ├── core/                      # Simplified core
│   │   └── src/
│   │       ├── adapters/
│   │       │   ├── git-adapter.ts     # Keep
│   │       │   └── openspec-adapter.ts # Keep
│   │       └── workflows/
│   │           ├── init.ts            # Project setup
│   │           ├── worktree.ts        # Worktree management
│   │           └── status.ts          # Status reporting
│   └── mcp-server/                # Deprecated but maintained
│       └── ...
└── AGENTS.md                      # References both openspec and speclife
```

## Impact

### Affected Specs
- `openspec/specs/mcp-server/spec.md` - deprecation notice
- `openspec/specs/core/spec.md` - simplified (remove AI adapters)

### Affected Code
- `packages/core/src/adapters/github-adapter.ts` - remove
- `packages/core/src/adapters/claude-*.ts` - remove
- `packages/core/src/adapters/cursor-adapter.ts` - remove
- `packages/cli/src/index.ts` - rewrite for new commands
- `openspec/commands/speclife/*` - new tracked slash commands (setup, start, implement, ship, land, release)
- `.cursor/commands/speclife/` - symlinks to tracked commands (gitignored)
- `.claude/commands/speclife/` - symlinks to tracked commands (gitignored)
- `.github/workflows/speclife-release.yml` - new release workflow (scaffolded by init)
- `.specliferc.yaml` - new minimal schema
- `openspec/speclife.md` - new AI context file
- `AGENTS.md` - reference both openspec and speclife

### Breaking Changes
- Config schema changes (migration needed)
- MCP tools deprecated (not removed)
- CLI commands renamed/changed

## Migration Path

1. **Phase 1**: Add slash commands + new CLI (this proposal)
2. **Phase 2**: Update docs, add config migration
3. **Phase 3**: Deprecation warnings in MCP tools
4. **Phase 4**: (Future) Remove MCP server package

## Benefits

1. **Zero Token Configuration**: No `GITHUB_TOKEN` or `ANTHROPIC_API_KEY`
2. **No Command Conflicts**: Works alongside openspec commands
3. **Simpler Codebase**: Remove ~500 lines of adapter code
4. **Clear Separation**: OpenSpec = specs, SpecLife = git/github
5. **Better Composability**: Works with @github MCP or `gh` CLI
6. **Cross-Editor**: Works with Cursor, Claude Code, future editors
7. **Auto-Release**: Patch/minor releases happen automatically after merge (per policy)
8. **Robust GitHub Integration**: Fallback from @github MCP to `gh` CLI ensures operations work
