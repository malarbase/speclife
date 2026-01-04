# SpecLife Agent Instructions

Instructions for AI coding assistants building the SpecLife project.

## TL;DR Quick Checklist

- Read `openspec/project.md` for conventions and tech stack
- Check `openspec/specs/` for requirements before implementing
- Follow the adapter pattern for external services
- Write tests alongside implementation
- Use TypeScript strict mode throughout

## Project Overview

SpecLife is a git/GitHub automation tool that complements OpenSpec for spec-driven development. It provides:

1. **CLI commands** for worktree and git operations
2. **Slash commands** for AI-guided workflows
3. **MCP server** (deprecated) for backward compatibility

**Key Insight:** SpecLife focuses on git/GitHub automation. Spec management is handled by OpenSpec.

| Tool | Responsibility |
|------|----------------|
| **OpenSpec** | Specs (proposals, validation, implementation guidance, archiving) |
| **SpecLife** | Git/GitHub (worktrees, branches, PRs, merging, releases) |

## Key Files

| File | Purpose |
|------|---------|
| `openspec/project.md` | Project context, conventions, tech stack |
| `openspec/speclife.md` | AI context for slash commands |
| `openspec/commands/speclife/*.md` | Slash command definitions |
| `packages/core/src/` | Shared business logic |
| `packages/cli/src/` | CLI implementation |
| `packages/mcp-server/src/` | MCP server (deprecated) |

## Architecture

### Slash Commands (Primary Interface)

Slash commands are markdown files that guide AI assistants through workflows:

```
openspec/commands/speclife/
├── setup.md     # AI-guided config discovery
├── start.md     # Create branch (or worktree for parallel work)
├── ship.md      # Archive, commit, push, create PR
├── land.md      # Merge, cleanup, auto-release
└── release.md   # Manual release (major versions)
```

These are symlinked to editor-specific directories:
- `.cursor/commands/speclife/` → `openspec/commands/speclife/`
- `.claude/commands/speclife/` → `openspec/commands/speclife/`

### CLI Commands

```bash
# Project setup
speclife init                        # Interactive project setup with editor selection
speclife init --tools cursor,claude-code  # Non-interactive setup with specific editors
speclife init -y                     # Accept all defaults

# Dashboard & status
speclife view                        # Interactive dashboard with progress bars
speclife status [change-id]          # Show change status (--json for scripting)
speclife list                        # List all changes (--json, --compact, --sort)

# Worktree management
speclife worktree create <change-id> # Create worktree + branch
speclife worktree rm <change-id>     # Remove worktree + branch
speclife worktree list               # List worktrees (--json)

# Configuration
speclife config path                 # Show global config path
speclife config list                 # List all config values (--json)
speclife config get <key>            # Get a config value
speclife config set <key> <value>    # Set a config value
speclife config unset <key>          # Remove a config value
speclife config reset                # Reset to defaults
speclife config edit                 # Open config in editor

# Validation & updates
speclife validate [change-id]        # Validate spec (--json, --strict for CI)
speclife update                      # Refresh slash command templates

# Shell completions
speclife completion bash             # Generate bash completions
speclife completion zsh              # Generate zsh completions
speclife completion fish             # Generate fish completions

# Info
speclife version                     # Show version
```

### Adapter Pattern

External services are wrapped in adapters:

```typescript
// packages/core/src/adapters/git-adapter.ts
export interface GitAdapter {
  createBranch(name: string, from?: string): Promise<void>;
  checkout(branch: string): Promise<void>;
  add(paths: string[]): Promise<void>;
  commit(message: string): Promise<string>;
  push(remote: string, branch: string): Promise<void>;
  // ...
}
```

### Workflow Pattern

Each operation is a workflow function:

```typescript
// packages/core/src/workflows/init.ts
export interface InitOptions {
  changeId: string;
  description?: string;
  noWorktree?: boolean;
}

export interface InitResult {
  branch: string;
  worktreePath?: string;
  proposalPath: string;
  tasksPath: string;
}

export async function initWorkflow(
  options: InitOptions,
  adapters: { git: GitAdapter; openspec: OpenSpecAdapter; config: SpecLifeConfig }
): Promise<InitResult> {
  // ...
}
```

## Testing Approach

### Unit Tests (Adapters)

```typescript
describe('GitAdapter', () => {
  it('creates branch from base', async () => {
    const mockGit = { checkoutLocalBranch: vi.fn() };
    // ...
  });
});
```

### Integration Tests (Workflows)

Use real git in temp directories:

```typescript
describe('initWorkflow', () => {
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speclife-test-'));
    await execaCommand('git init', { cwd: tempDir });
  });
  
  // ...
});
```

## DO NOT

- Auto-commit without explicit user action (AI confirmation counts)
- Store credentials in config files (use environment variables)
- Assume any specific project structure beyond OpenSpec conventions
- Block on long operations without progress updates
- Swallow errors silently (always propagate with context)

## 🚨 CRITICAL: Working with Worktrees

**The #1 rule when working on spec branches in worktrees:**

### All File Edits Must Use Worktree Paths

When implementing a change in a worktree, **every file operation must target the worktree directory**, not the main repository.

✅ **CORRECT paths** (when working in worktree `add-feature`):
```
/Users/.../speclife/worktrees/add-feature/openspec/commands/...
/Users/.../speclife/worktrees/add-feature/packages/core/...
/Users/.../speclife/worktrees/add-feature/README.md
```

❌ **WRONG paths** (main repo - do NOT use these):
```
/Users/.../speclife/openspec/commands/...         ← Main repo!
/Users/.../speclife/packages/core/...             ← Main repo!
/Users/.../speclife/README.md                     ← Main repo!
```

### Detection and Validation

**BEFORE making ANY file edits:**

1. ✓ Verify current directory contains `worktrees/<change-id>`
2. ✓ Check `git branch --show-current` matches your change
3. ✓ Confirm first file operation uses worktree prefix
4. ✓ If path looks wrong: STOP and ask user to confirm location

### If You Realize You're in the Wrong Location

**STOP IMMEDIATELY** and notify the user:

```
❌ Error: I was about to edit files in the main repo, but there's a worktree.
   
   All changes should happen in: worktrees/<change-id>/
   
   Should I continue in main repo, or do you want me to work from the worktree?
```

### Verification Logic

Each file operation should pass this mental check:

```typescript
const currentPath = "/Users/.../speclife/...";
const isInWorktree = currentPath.includes(`worktrees/${changeId}/`);
const branch = "spec/add-feature";
const worktreeExists = true; // check if worktree dir exists

const shouldBeInWorktree = branch.startsWith('spec/') && worktreeExists;

if (shouldBeInWorktree && !isInWorktree) {
  ERROR: "Wrong location! Must use worktree path."
}
```

### Why This Matters

- **Worktrees enable parallel work** - changes must be isolated from main
- **Git state integrity** - main branch should stay clean during development
- **Workflow correctness** - changes belong to their feature branch, not main
- **User expectations** - if they created a worktree, they expect you to use it
- **Prevents confusion** - avoids the "where did my changes go?" problem

### Branch-Only Mode (Default)

If a spec branch exists but **no worktree** was created (the default):
- ✅ Work directly in main repo is correct
- Standard single-branch workflow applies
- Use `/speclife start "..." in a worktree` for parallel development

## Code Style Reminders

```typescript
// ✓ Good: Explicit return types
async function getStatus(): Promise<ChangeStatus> { }

// ✗ Bad: Implicit any
async function getStatus() { }

// ✓ Good: Structured errors
throw new SpecLifeError('BRANCH_EXISTS', `Branch ${name} already exists`, { branch: name });

// ✗ Bad: String errors
throw new Error('branch exists');

// ✓ Good: Options object for 3+ params
function init(options: InitOptions): Promise<InitResult>

// ✗ Bad: Many positional params
function init(changeId: string, desc: string, skip: boolean, dry: boolean)
```

## Quick Reference

### File Purposes
- `adapters/*.ts` - External service wrappers
- `workflows/*.ts` - Business logic operations
- `types.ts` - Shared TypeScript interfaces
- `config.ts` - Configuration loading and validation
- `global-config.ts` - XDG-compliant global configuration
- `configurators/*.ts` - Editor configuration registry
- `completions/*.ts` - Shell completion generators
- `utils/progress.ts` - Progress bar utilities
- `utils/task-progress.ts` - Task parsing utilities

### Key Commands
```bash
npm run build        # Build all packages
npm run test         # Run all tests
npm run typecheck    # TypeScript validation
```

### Environment Variables
```bash
GITHUB_TOKEN         # GitHub API access (for deprecated MCP server)
SPECLIFE_DEBUG=1     # Enable debug logging
```
