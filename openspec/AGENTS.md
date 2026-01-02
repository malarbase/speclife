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
├── start.md     # Create worktree + branch
├── ship.md      # Archive, commit, push, create PR
├── land.md      # Merge, cleanup, auto-release
└── release.md   # Manual release (major versions)
```

These are symlinked to editor-specific directories:
- `.cursor/commands/speclife/` → `openspec/commands/speclife/`
- `.claude/commands/speclife/` → `openspec/commands/speclife/`

### CLI Commands

```bash
speclife init                        # Project setup
speclife worktree create <change-id> # Create worktree + branch
speclife worktree rm <change-id>     # Remove worktree + branch
speclife worktree list               # List worktrees
speclife status [change-id]          # Show status
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
