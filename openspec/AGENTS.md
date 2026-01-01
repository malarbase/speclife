# SpecLife Agent Instructions

Instructions for AI coding assistants building the SpecLife project.

## TL;DR Quick Checklist

- Read `openspec/project.md` for conventions and tech stack
- Check `openspec/specs/` for requirements before implementing
- Follow the adapter pattern for external services
- Write tests alongside implementation
- Use TypeScript strict mode throughout

## Project Overview

SpecLife is an MCP server that automates spec-driven development. It enables developers to use AI assistants (Claude, Cursor) as the primary interface for creating, implementing, and shipping code changes based on OpenSpec proposals.

**Key Insight:** The MCP server IS the product. The CLI is secondary (for CI/scripting).

## Key Files

| File | Purpose |
|------|---------|
| `openspec/project.md` | Project context, conventions, tech stack |
| `openspec/specs/mcp-server/spec.md` | MCP tool requirements |
| `openspec/specs/core/spec.md` | Core library requirements |
| `packages/core/src/` | Shared business logic |
| `packages/mcp-server/src/` | MCP server implementation |

## Implementation Priority

### Phase 1: Foundation (MVP)
1. **Core adapters:** GitAdapter, GitHubAdapter, ConfigLoader, OpenSpecAdapter
2. **Init workflow:** Create branch (or worktree), scaffold proposal files
3. **Status workflow:** Read change state from filesystem
4. **MCP tools:** `speclife_init`, `speclife_status`, `speclife_list`

### Phase 2: Submit & Merge Flow
1. **Submit workflow:** Stage, commit, push, create PR, archive change
2. **MCP tool:** `speclife_submit`
3. **Merge workflow:** Merge PR, switch to main, cleanup worktree
4. **MCP tool:** `speclife_merge`

### Phase 3: AI Implementation (with Test Loop)
1. **AI adapter:** Claude API with tool-use
2. **Implement workflow:** Read specs, generate code, run tests, fix failures
3. **Internal test loop:** implement → test → fix → repeat until passing
4. **MCP tool:** `speclife_implement`

### Phase 4: Worktree Support
1. **Worktree management:** Create, list, cleanup worktrees
2. **Parallel lifecycles:** Multiple changes running simultaneously
3. **Cross-worktree status:** See all active changes

### Phase 5: Polish
1. **CLI wrapper:** Thin CLI for CI/scripts
2. **Progress persistence:** Resume failed operations
3. **Error recovery:** Rollback, stash, retry logic

## Architecture Guidance

### Adapter Pattern
All external services are wrapped in adapters:

```typescript
// packages/core/src/adapters/git-adapter.ts
export interface GitAdapter {
  createBranch(name: string, from?: string): Promise<void>;
  checkout(branch: string): Promise<void>;
  add(paths: string[]): Promise<void>;
  commit(message: string): Promise<string>; // returns commit SHA
  push(remote: string, branch: string): Promise<void>;
  getCurrentBranch(): Promise<string>;
  status(): Promise<GitStatus>;
}

// Implementation uses simple-git
export function createGitAdapter(repoPath: string): GitAdapter {
  const git = simpleGit(repoPath);
  return {
    async createBranch(name, from) { /* ... */ },
    // ...
  };
}
```

### Workflow Pattern
Each operation is a workflow function:

```typescript
// packages/core/src/workflows/init.ts
export interface InitOptions {
  changeId: string;
  description?: string;
  skipBranch?: boolean;
  dryRun?: boolean;
}

export interface InitResult {
  branch: string;
  proposalPath: string;
  tasksPath: string;
}

export async function initWorkflow(
  options: InitOptions,
  adapters: { git: GitAdapter; config: SpecLifeConfig }
): Promise<InitResult> {
  // 1. Validate changeId
  // 2. Create branch (unless skipBranch)
  // 3. Scaffold proposal files
  // 4. Return result
}
```

### MCP Tool Definition
Tools expose workflows to AI assistants:

```typescript
// packages/mcp-server/src/tools/init.ts
export const initTool: Tool = {
  name: "speclife_init",
  description: "Initialize a new change: create branch and scaffold proposal files",
  inputSchema: {
    type: "object",
    properties: {
      changeId: {
        type: "string",
        description: "Unique identifier for the change (kebab-case, e.g., add-user-auth)"
      },
      description: {
        type: "string",
        description: "Brief description of the change (populates proposal.md)"
      }
    },
    required: ["changeId"]
  }
};

export async function handleInit(args: { changeId: string; description?: string }) {
  const config = await loadConfig();
  const git = createGitAdapter(process.cwd());
  
  const result = await initWorkflow(
    { changeId: args.changeId, description: args.description },
    { git, config }
  );
  
  return {
    content: [{
      type: "text",
      text: `✓ Created branch ${result.branch}\n` +
            `✓ Scaffolded proposal at ${result.proposalPath}`
    }]
  };
}
```

## Testing Approach

### Unit Tests (Adapters)
Mock external services:

```typescript
// packages/core/test/adapters/git-adapter.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('GitAdapter', () => {
  it('creates branch from base', async () => {
    const mockGit = {
      checkoutLocalBranch: vi.fn(),
    };
    // ...
  });
});
```

### Integration Tests (Workflows)
Use real git in temp directories:

```typescript
// packages/core/test/workflows/init.test.ts
import { describe, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';

describe('initWorkflow', () => {
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speclife-test-'));
    await execaCommand('git init', { cwd: tempDir });
  });
  
  afterEach(async () => {
    await rm(tempDir, { recursive: true });
  });
  
  it('creates branch and scaffolds files', async () => {
    // ...
  });
});
```

### MCP Tool Tests
Verify schema and basic invocation:

```typescript
// packages/mcp-server/test/tools.test.ts
describe('speclife_init tool', () => {
  it('has valid schema', () => {
    expect(initTool.inputSchema.required).toContain('changeId');
  });
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
npm run mcp:start    # Start MCP server
```

### Environment Variables
```bash
GITHUB_TOKEN         # GitHub API access
ANTHROPIC_API_KEY    # Claude API access
SPECLIFE_DEBUG=1     # Enable debug logging
```

