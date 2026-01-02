# Design: SpecLife as OpenSpec Complement

## Overview

This document captures the architectural reasoning for re-positioning speclife as a **complement** to openspec rather than a standalone MCP-based system.

## Core Insight

**OpenSpec handles specs. SpecLife handles git/github.**

The original speclife architecture tried to be a complete solution:
- Spec management (duplicating openspec)
- AI-driven implementation (awkward tool-calling-tool)
- GitHub integration (requiring token configuration)

The new architecture recognizes that:
- OpenSpec already has excellent spec management (`/openspec-proposal`, `/openspec-apply`, `/openspec-archive`)
- The agent already has file editing and terminal capabilities
- Users likely have @github MCP already configured
- SpecLife should add git/github automation, not duplicate spec management

## Separation of Concerns

| Responsibility | Tool | Commands |
|---------------|------|----------|
| Create proposal/tasks | OpenSpec | `/openspec-proposal` |
| Implement tasks | OpenSpec | `/openspec-apply` |
| Archive completed specs | OpenSpec | `/openspec-archive` (invoked by `/speclife ship`) |
| Create worktree/branch | SpecLife | `/speclife start` (or CLI: `speclife worktree create`) |
| Archive + commit + push + create PR | SpecLife | `/speclife ship` (invokes `/openspec-archive`) |
| Merge PR, cleanup, auto-release | SpecLife | `/speclife land` |
| Manual release (major versions) | SpecLife | `/speclife release` |

## Design Principles

### 1. No Command Conflicts

SpecLife slash commands are **additive**:

```
# OpenSpec commands (unchanged)
/openspec-proposal    # Create specs
/openspec-apply       # Implement
/openspec-archive     # Archive

# SpecLife commands (new, non-conflicting)
/speclife start       # Create worktree + branch (can chain to /openspec-proposal)
/speclife ship        # Archive, commit, push, create PR (invokes /openspec-archive)
/speclife land        # Merge PR, cleanup, auto-release
/speclife release     # Manual release (major versions)

# Convenience proxy (not advertised, but supported)
/speclife implement   # Proxies to /openspec-apply
```

**Note:** `/speclife implement` exists as a convenience proxy for users who expect it, but documentation and suggestions should direct users to `/openspec-apply` directly.

### 2. CLI for Deterministic Git Operations

```bash
speclife init                        # One-time project setup
speclife worktree create <id>        # Create worktree + branch
speclife worktree rm <id>            # Remove worktree + branch
speclife worktree list               # List worktrees
speclife status [id]                 # Show status
speclife version                     # Show version
```

### 3. Slash Commands for Agent-Guided Flows

Slash commands guide the agent through multi-step processes that require judgment:

```markdown
# /speclife ship

**Steps**
1. Run `openspec validate <change-id>` to ensure spec is valid
2. Read proposal.md for commit message guidance
3. Read openspec/speclife.md for test/build commands
4. Run `git add -A && git commit -m "<message>"`
5. Run `git push -u origin <branch>`
6. Create PR using one of these methods (in order):
   - **Preferred:** @github MCP if available
   - **Fallback:** `gh pr create --fill --base main`
7. Report PR URL to user

**Reference**
- Use conventional commits: feat:, fix:, docs:, etc.
- Check openspec/speclife.md for project commands
```

### 4. Delegate to Existing MCPs (with `gh` CLI Fallback)

Instead of implementing GitHub operations:

| Operation | Old (MCP Server) | New (Slash Command) |
|-----------|-----------------|---------------------|
| Create PR | `octokit.pulls.create()` | @github MCP or `gh pr create` |
| Merge PR | `octokit.pulls.merge()` | @github MCP or `gh pr merge` |
| Check status | `octokit.pulls.get()` | @github MCP or `gh pr view` |

**Fallback Strategy:**
1. **Preferred:** Use @github MCP if available
2. **Fallback:** Use `gh` CLI (GitHub's official CLI)
3. **Manual:** Provide GitHub URL for manual action

Benefits:
- No `GITHUB_TOKEN` configuration needed (MCP or `gh` handles auth)
- Works with whatever GitHub integration user has
- Agent can handle errors intelligently
- Robust across different setups

### 5. Split Configuration: Minimal YAML + `openspec/speclife.md`

**Key insight:** Configuration has two audiences:
1. **CLI** needs deterministic, machine-parseable values
2. **AI** needs rich, human-readable context

**Solution:** Split configuration by audience, with a **separate file** for AI context:

### 6. Tracked Slash Commands (Version-Controlled)

**Key insight:** Slash commands should be version-controlled so they're available in all branches and worktrees without re-running setup.

**Solution:** Store commands in `openspec/commands/speclife/` (tracked), with editor-specific directories configured to reference them:

```
openspec/
└── commands/
    └── speclife/           # Tracked in git
        ├── setup.md        # AI-guided config discovery
        ├── start.md        # Create worktree + branch
        ├── implement.md    # Proxy to /openspec-apply (convenience)
        ├── ship.md         # Archive, commit, push, create PR
        ├── land.md         # Merge, cleanup, auto-release
        └── release.md      # Manual release (major versions)

.cursor/
└── commands/
    └── speclife/           # Gitignored, created by speclife init
        └── (symlinks to openspec/commands/speclife/)

.claude/
└── commands/
    └── speclife/           # Gitignored, created by speclife init
        └── (symlinks to openspec/commands/speclife/)
```

**Why tracked commands?**
- **Available in worktrees:** Git worktrees get commands automatically
- **Version-controlled:** Command changes propagate to all branches
- **One-time setup:** `speclife init` only runs once per machine to configure editor symlinks
- **Portable:** New clones just run `speclife init` to set up editor integration

**Why symlinks?**
- Editor directories (`.cursor/`, `.claude/`) stay gitignored
- Editors get their expected directory structure
- Changes to tracked commands are immediately reflected

### 7. Worktrees and Workspaces

**Key insight:** The agent runs from the main workspace directory, not inside worktrees.

```
speclife/                          ← Cursor/Claude workspace (opened here)
├── .cursor/commands/speclife/     ← Symlinks exist here ✓
├── openspec/commands/speclife/    ← Tracked commands ✓
└── worktrees/
    └── add-user-auth/             ← Worktree (just files, not a separate workspace)
        ├── (no .cursor/ here)
        └── (files checked out to feature branch)
```

**Expected workflow:**
1. Keep editor workspace open at repo root (`speclife/`)
2. Worktrees are subdirectories containing branch files
3. Agent edits files in `worktrees/<change-id>/` while running from root
4. Slash commands work because symlinks exist in root `.cursor/commands/`

**Edge case:** If opening a worktree as a separate workspace:
- Run `speclife init` in the worktree to create symlinks
- `speclife init` is idempotent — if tracked commands exist, it just creates symlinks

#### Minimal `.specliferc.yaml` (CLI only)

```yaml
# Only what CLI needs - auto-detected where possible
specDir: openspec

git:
  baseBranch: main
  branchPrefix: spec/
  worktreeDir: worktrees
```

7 lines total. Most can be auto-detected:
- `specDir`: CLI looks for `openspec/` or `specs/`
- `git.baseBranch`: from `git remote show origin`

#### AI Context in `openspec/speclife.md` (NEW)

A separate file for SpecLife-specific AI context, **not modifying** user's `project.md`:

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

**Why a separate file?**
- **Doesn't modify user's project.md** - clean separation of concerns
- **`speclife init` owns it** - can scaffold with TODOs
- **`/speclife setup` populates it** - AI-guided discovery
- AI gets rich markdown context, not just YAML key-values

#### `/speclife setup` Populates It

```markdown
# /speclife setup

**Goal**: Discover and populate openspec/speclife.md

**Steps**
1. Read openspec/speclife.md to see what needs configuration
2. Inspect package.json (or Makefile, Cargo.toml, etc.) to detect:
   - Test command (scripts.test)
   - Build command (scripts.build)
   - Lint command (scripts.lint)
3. Identify key context files in the project
4. Update openspec/speclife.md with discovered values
5. Report what was configured
```

## Workflow Comparison

### Before: MCP-Based (Standalone)

```
┌─────────────────────────────────────────────────────┐
│                     Agent                            │
├─────────────────────────────────────────────────────┤
│ User: "Add user auth"                                │
│                                                      │
│ Agent: [calls speclife_init MCP]                     │
│        ↓                                             │
│ ┌───────────────────────────────────────────────┐   │
│ │          speclife MCP Server                   │   │
│ │  - Creates worktree                            │   │
│ │  - Scaffolds proposal                          │   │
│ │  - Creates draft PR (GITHUB_TOKEN)             │   │
│ └───────────────────────────────────────────────┘   │
│                                                      │
│ Agent: [calls speclife_implement MCP]                │
│        ↓                                             │
│ ┌───────────────────────────────────────────────┐   │
│ │          speclife MCP Server                   │   │
│ │  - Invokes Claude API (ANTHROPIC_API_KEY)      │   │
│ │  - Tool-calling-tool (awkward)                 │   │
│ └───────────────────────────────────────────────┘   │
│                                                      │
│ Agent: [calls speclife_submit MCP]                   │
│        ↓                                             │
│ ┌───────────────────────────────────────────────┐   │
│ │          speclife MCP Server                   │   │
│ │  - Commits, pushes                             │   │
│ │  - Creates PR (GITHUB_TOKEN)                   │   │
│ └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘

Problems:
- Requires GITHUB_TOKEN + ANTHROPIC_API_KEY
- Duplicates openspec's proposal/implement flow
- Tool-calling-tool is awkward
- MCP server is a maintenance burden
```

### After: Slash Commands (Complement)

```
┌─────────────────────────────────────────────────────┐
│                     Agent                            │
├─────────────────────────────────────────────────────┤
│ # One-time setup (two phases)                        │
│ User: speclife init                                  │
│ CLI:  → Detects openspec/, git base branch           │
│       → Creates .specliferc.yaml (minimal)           │
│       → Creates openspec/speclife.md (template)      │
│       → Creates openspec/commands/speclife/*.md      │
│       → Creates .github/workflows/speclife-release.yml│
│       → Configures .cursor/ and .claude/ (symlinks)  │
│       → Updates AGENTS.md                            │
│       → Prompts: "Run /speclife setup"               │
│                                                      │
│ User: /speclife setup                                │
│ Agent: → Inspects package.json                       │
│        → Finds: npm test, npm run build              │
│        → Populates openspec/speclife.md              │
│                                                      │
│ # Starting a change (with description)               │
│ User: /speclife start "Add user authentication"      │
│ Agent: → Derives change-id: add-user-auth            │
│        → Runs: speclife worktree create add-user-auth│
│        → Invokes /openspec-proposal with description │
│        → Scaffolds proposal.md, tasks.md             │
│                                                      │
│ # Or: Starting a change (without description)        │
│ User: /speclife start                                │
│ Agent: → Asks for change-id or description           │
│        → Runs: speclife worktree create <change-id>  │
│        → Suggests: "Run /openspec-proposal"          │
│                                                      │
│ User: /openspec-apply                                │
│ Agent: [uses native capabilities]                    │
│        → Implements tasks                            │
│        → Runs tests                                  │
│        → Updates task status                         │
│        → User may commit changes during this phase   │
│                                                      │
│ User: /speclife ship                                 │
│ Agent: [loads .cursor/commands/speclife/ship.md]     │
│        → Runs: openspec validate                     │
│        → Invokes /openspec-archive (included in PR)  │
│        → Runs: git add -A && git commit              │
│        → Runs: git push                              │
│        → Creates PR via @github MCP (or gh CLI)      │
│                                                      │
│ User: /speclife land                                 │
│ Agent: [loads .cursor/commands/speclife/land.md]     │
│        → Merges PR via @github MCP (or gh CLI)       │
│        → Runs: git checkout main && git pull         │
│        → Runs: speclife worktree rm add-user-auth    │
│        → Checks release policy in speclife.md        │
│        → If auto-release (patch/minor):              │
│            → Creates release PR automatically        │
│        → If manual release (major):                  │
│            → Suggests: "Run /speclife release"       │
└─────────────────────────────────────────────────────┘

Benefits:
- No token configuration needed
- No command conflicts with openspec
- Agent uses native capabilities
- Clear separation of concerns
- Works with @github MCP or gh CLI
- Auto-release based on policy (no manual step for patch/minor)
```

## Slash Command Details

### `/speclife start`

**Goal**: Create a new worktree and branch for a change, optionally scaffolding the proposal.

**Input**: `<description>` (optional) - A brief description of the change

**Steps**:
1. **If description provided:**
   - Derive a kebab-case change-id from the description (e.g., "Add user auth" → `add-user-auth`)
   - Run `speclife worktree create <change-id>`
   - Invoke `/openspec-proposal` with the description to scaffold proposal.md and tasks.md
2. **If no description provided:**
   - Ask user for a change-id or description
   - Run `speclife worktree create <change-id>`
   - Suggest: "Run /openspec-proposal to create the spec"

**Naming conventions**:
- Use kebab-case for change-id
- Prefix with verb: add-, fix-, update-, remove-, etc.
- Keep it short but descriptive (3-5 words max)

### `/speclife ship`

**Goal**: Archive spec, commit, push, and create PR for review.

**Preconditions**:
- On a spec/* branch
- Implementation complete (may have existing commits from /openspec-apply)

**Steps**:
1. Validate spec with `openspec validate <change-id>`
2. **Invoke `/openspec-archive <change-id>`** to archive the spec (moves to archive, updates project.md)
3. Read proposal.md for commit message guidance
4. Stage all changes: `git add -A`
5. Commit with conventional message: `git commit -m "feat: ..."`
   - Note: User may have prior commits from /openspec-apply; this commits any remaining changes
6. Push to remote: `git push -u origin <branch>`
7. Create PR using @github MCP or `gh pr create --fill --base main`
8. Report PR URL

**Why archive here?** The archive is included in the PR so when merged, the spec is already in the archive folder. No post-merge cleanup needed.

### `/speclife land`

**Goal**: Merge approved PR, clean up worktree, and auto-release if policy allows.

**Preconditions**:
- PR exists and is approved
- CI passing

**Steps**:
1. Check PR status via @github MCP or `gh pr view`
2. Merge PR (squash) via @github MCP or `gh pr merge --squash`
3. Switch to main: `git checkout main`
4. Pull latest: `git pull`
5. Clean up: `speclife worktree rm <change-id>`
6. **Check release policy in openspec/speclife.md:**
   - Analyze commits to determine bump type (patch/minor/major)
   - If bump type is in **auto-release** list → create release PR automatically
   - If bump type requires **manual release** → suggest: "Run /speclife release --major"

**Note**: Archive is already done in `/speclife ship`, so it's included in the merged PR.

### `/speclife release`

**Goal**: Create a release with version bump (for manual releases).

**When to use**:
- Major version bumps (per release policy)
- Forcing a release when auto-release is disabled
- Creating a release independently of `/speclife land`

**Preconditions**:
- On main branch
- Changes merged since last release

**Steps**:
1. Analyze commits since last tag
2. Suggest version bump (or use explicit --major/--minor/--patch)
3. Update version in package.json
4. Update CHANGELOG.md
5. Commit with message: `chore(release): vX.X.X`
6. Push and create release PR via @github MCP or `gh pr create`

**Note**: When the release PR is merged, the existing GitHub Actions workflow (`.github/workflows/speclife-release.yml`) automatically creates the git tag and GitHub release.

## GitHub Actions Integration

`speclife init` scaffolds a GitHub Actions workflow for automated releases:

```yaml
# .github/workflows/speclife-release.yml (scaffolded by speclife init)
name: Create Release

on:
  push:
    branches: [main]

jobs:
  release:
    if: startsWith(github.event.head_commit.message, 'chore(release):')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Extract version and create tag
        run: |
          VERSION=$(echo "${{ github.event.head_commit.message }}" | grep -oP 'v\d+\.\d+\.\d+')
          git tag $VERSION && git push origin $VERSION
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ steps.version.outputs.version }}
          generate_release_notes: true
```

**Flow:**
1. `/speclife land` or `/speclife release` creates a PR with message `chore(release): vX.X.X`
2. When PR is merged → workflow triggers
3. Workflow creates git tag and GitHub release automatically

## Migration

### For Existing SpecLife Users

1. Run `speclife init` to:
   - Create tracked slash commands in `openspec/commands/speclife/`
   - Configure editor symlinks (`.cursor/`, `.claude/`)
   - Scaffold `.github/workflows/speclife-release.yml`
   - Update config schema
2. Commit the new files (`openspec/commands/`, `.github/workflows/`)
3. Use openspec commands for spec management
4. Use speclife commands for git/github automation

### For New Clones / Worktrees

Just run `speclife init` once to set up editor symlinks. The tracked commands and workflows are already available via git.

### Config Migration

```yaml
# Old config
aiProvider: claude        # Remove
aiModel: claude-sonnet-4  # Remove
github:
  owner: malarbase        # Remove
  repo: speclife          # Remove
  baseBranch: main        # Move to git.baseBranch

# New config
git:
  baseBranch: main
  branchPrefix: spec/
  worktreeDir: worktrees
```

## Conclusion

The new architecture:
1. **Complements** openspec instead of duplicating it
2. **Eliminates** token configuration burden
3. **Simplifies** codebase by removing adapters
4. **Clarifies** responsibilities (specs vs git/github)
5. **Leverages** existing tools (openspec, @github MCP)
