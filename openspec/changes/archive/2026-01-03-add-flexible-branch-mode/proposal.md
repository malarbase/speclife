# Add Flexible Branch Mode

## Why

Currently, `/speclife start` always creates a worktree for isolated development. However, some users prefer a simpler workflow:

1. **IDE compatibility** - Some IDEs don't handle worktrees well (need reload, lose state)
2. **Simpler mental model** - One repo, switch branches, no directory juggling
3. **Disk space** - Worktrees duplicate dependencies (even with symlinks, there's overhead)
4. **Single-tasking** - Not everyone needs parallel changes

Additionally, we discovered that **slash commands lack clear execution triggers**. When a slash command is invoked, the AI agent may:
- Continue a prior conversation instead of starting the workflow
- Skip steps because the command reads like documentation, not instructions
- Misinterpret "based on context" as "edit these files" vs "use this as input"

## What Changes

### 1. Flexible Branch Mode in `/speclife start`

Add natural language detection to support both modes:

```
/speclife start "Add OAuth login"              # Worktree (default)
/speclife start "Add OAuth login" in a branch  # Branch-only
```

**Mode detection triggers:**
- "in a branch", "branch only", "no worktree", "simple" → Branch-only
- "in a worktree", "with worktree", "parallel" → Worktree
- Neither → Worktree (default)

### 2. New `/speclife convert` Command

Allow switching modes mid-flight:

```
/speclife convert to worktree   # Upgrade: need parallel work
/speclife convert to branch     # Downgrade: want simpler setup
```

### 3. Update Mode Detection in Other Commands

**`/speclife ship`:** Detect spec mode by branch prefix (`spec/*`), not worktree existence.

**`/speclife land`:** Check if worktree exists before trying to remove it.

### 4. Add Execution Section to All Slash Commands

Add a clear "⚡ Execution" section to each slash command that states:

```markdown
## ⚡ Execution

**When this command is invoked, IMMEDIATELY execute the workflow below.**

- Do NOT skip steps or jump to implementation
- If mid-conversation, treat invocation as "start fresh with this workflow"
- If required inputs are missing, prompt the user
- If user says "based on context", derive inputs from recent discussion
- **STOP at designated boundaries—do NOT chain to other commands automatically**
```

This makes it explicit that slash commands are **action triggers**, not reference documentation.

### 5. Add Explicit STOP Boundaries

Commands that chain to other workflows must have explicit STOP points:

- `/speclife start` → STOP after scaffolding, wait for `/openspec-apply`
- `/speclife ship` → STOP after PR created, wait for `/speclife land`
- `/speclife land` → STOP after merge, report release status

The agent should **never** automatically invoke the next command in a chain unless the user explicitly requests it.

## Acceptance Criteria

- [ ] `/speclife start "desc" in a branch` creates branch without worktree
- [ ] `/speclife start "desc"` still creates worktree (backward compatible)
- [ ] `/speclife convert to worktree` upgrades branch-only to worktree
- [ ] `/speclife convert to branch` downgrades worktree to branch-only
- [ ] `/speclife ship` works in both modes (detects by branch prefix)
- [ ] `/speclife land` cleans up appropriately based on mode
- [ ] All slash commands have "⚡ Execution" section
- [ ] Agent follows workflow when command is invoked
- [ ] Agent STOPS at designated boundaries (doesn't auto-chain commands)

## Out of Scope

- CLI changes (`speclife worktree create` stays worktree-only)
- MCP server changes (deprecated)
- Changes to OpenSpec commands

## References

- Discussion: Natural language mode detection vs flags
- Root cause analysis: Why agent didn't execute workflow

