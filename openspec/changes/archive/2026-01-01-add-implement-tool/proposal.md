## Why

SpecLife can now init, submit, and merge changes, but the **implementation step** is still manual. The `speclife_implement` tool will enable spec-driven development with multiple implementation modes:

1. Reading the proposal and tasks from the change
2. Gathering relevant codebase context
3. Using AI (Claude CLI, Claude SDK) or IDE (Cursor) to implement tasks
4. Running tests after each task (automated modes)
5. Automatically fixing failures up to 3 retries (automated modes)
6. Marking tasks complete when tests pass

This completes the vision: **"User describes what they want → AI implements it → PR created → Merged"**

## Implementation Modes

| Mode | Description | Automation Level |
|------|-------------|------------------|
| `claude-cli` | Claude CLI with MCP servers (filesystem, shell) | **Primary** - Semi-automated with MCP ecosystem |
| `claude-sdk` | Direct Anthropic SDK with tool-use | Fully automated pipeline |
| `cursor` | Opens Cursor IDE in worktree directory | Manual - user takes over |

### Mode: `claude-cli` (Primary)

Uses the Claude CLI which supports MCP servers natively. SpecLife:
1. Generates a prompt with proposal, tasks, and context
2. Invokes `claude` CLI with the worktree as working directory
3. Claude CLI connects to configured MCPs (filesystem, shell) for file operations
4. User monitors and can interrupt/guide the session

### Mode: `claude-sdk`

Direct integration with Anthropic SDK for fully automated implementation:
1. SpecLife defines tools for file read/write/edit and shell execution
2. Runs agentic loop with Claude, executing tools server-side
3. Tests run automatically after each task
4. Fix loop retries up to 3 times on failure

### Mode: `cursor`

Opens Cursor IDE for manual/assisted implementation:
1. SpecLife opens Cursor with the worktree directory
2. User implements tasks using Cursor's AI features
3. User manually marks tasks complete

## What Changes

1. **AI Adapter:** `packages/core/src/adapters/ai-adapter.ts` - Multi-mode AI integration
   - Claude CLI runner (primary)
   - Claude SDK with tool-use
   - Cursor launcher
2. **Implement Workflow:** `packages/core/src/workflows/implement.ts` - Orchestrates based on mode
3. **MCP Tool:** `packages/mcp-server/src/tools/implement.ts` - Exposes workflow to AI assistants
4. **Test Runner:** Integration with project's test command from config (automated modes)

## Agentic Loop Design (claude-sdk mode)

```
┌─────────────────────────────────────────────────────────┐
│                  speclife_implement                      │
├─────────────────────────────────────────────────────────┤
│  1. Read proposal.md, tasks.md, design.md               │
│  2. Gather context (affected files from proposal)       │
│  3. For each uncompleted task:                          │
│     ├─→ Generate code using AI                          │
│     ├─→ Write files to disk                             │
│     ├─→ Run tests (config.testCommand)                  │
│     ├─→ If tests fail:                                  │
│     │   ├─→ Analyze failure                             │
│     │   ├─→ Fix code (up to 3 iterations)               │
│     │   └─→ Re-run tests                                │
│     └─→ Mark task complete in tasks.md                  │
│  4. Return summary of changes                           │
└─────────────────────────────────────────────────────────┘
```

## Claude CLI Flow (claude-cli mode)

```
┌─────────────────────────────────────────────────────────┐
│                  speclife_implement                      │
├─────────────────────────────────────────────────────────┤
│  1. Generate implementation prompt from spec            │
│  2. Write prompt to temp file or pipe to stdin          │
│  3. Invoke: claude --cwd <worktree> < prompt            │
│  4. Claude CLI uses MCPs for file/shell operations      │
│  5. Session runs until completion or user interrupt     │
│  6. Parse output for task completion status             │
└─────────────────────────────────────────────────────────┘
```

## Cursor Flow (cursor mode)

```
┌─────────────────────────────────────────────────────────┐
│                  speclife_implement                      │
├─────────────────────────────────────────────────────────┤
│  1. Generate context summary for user                   │
│  2. Open Cursor: cursor <worktree-path>                 │
│  3. Return "Cursor opened - implement tasks manually"   │
└─────────────────────────────────────────────────────────┘
```

## Key Scenarios

| Scenario | Behavior |
|----------|----------|
| Implement with claude-cli (default) | Invoke Claude CLI with MCPs in worktree |
| Implement with claude-sdk | Run fully automated agentic loop |
| Implement with cursor | Open Cursor IDE in worktree |
| Implement all tasks | Loop through uncompleted tasks with test loop (automated modes) |
| Implement specific task | Only implement `taskId` (e.g., "1.2") |
| Dry run | Return planned prompt/actions without executing |
| Test loop exhausted | Return partial progress with failing test details (claude-sdk) |
| Implementation fails | Return error with context, don't leave inconsistent state |

## Configuration

```yaml
# .specliferc.yaml
implementMode: claude-cli  # claude-cli | claude-sdk | cursor
aiModel: claude-sonnet-4-20250514  # Model for claude-sdk mode
testCommand: npm test      # Auto-run tests (automated modes)

# Claude CLI uses its own config for MCPs (~/.claude/config.json)
```

## Impact

- Affected specs: `openspec/specs/mcp-server/spec.md` (Implement Tool requirement)
  - See spec delta: `changes/add-implement-tool/specs/mcp-server/spec.md`
- Affected code:
  - `packages/core/src/adapters/ai-adapter.ts` (new) - Multi-mode implementation
  - `packages/core/src/adapters/claude-cli-adapter.ts` (new) - Claude CLI invocation
  - `packages/core/src/adapters/cursor-adapter.ts` (new) - Cursor IDE launcher
  - `packages/core/src/workflows/implement.ts` (new) - Mode-aware orchestration
  - `packages/mcp-server/src/tools/implement.ts` (new) - MCP tool definition
  - Various index files for exports
