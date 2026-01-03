# Add Verbal Resume Support to /speclife start

## Why

Currently, `/speclife start` only supports creating **new** proposals. If a proposal already exists in `openspec/changes/`, there's no built-in way to resume it. Users must manually:
1. Create the branch: `git checkout -b spec/<change-id>`
2. Or use CLI: `speclife worktree create <change-id>`
3. Then continue with `/openspec-apply`

This breaks the natural conversational flow and requires users to drop into command-line git operations.

### Use Cases

1. **Planning ahead** - Write multiple proposals, implement later selectively
2. **Team collaboration** - Someone writes proposal, another developer implements
3. **Interrupted work** - Proposal exists but branch was deleted/cleaned up
4. **Review-first workflow** - Get proposal approved before creating implementation branch
5. **Parallel exploration** - Write several proposals, pick one to start with

## What

Enhance `/speclife start` to detect **resume intent** through natural language, matching the existing pattern for branch/worktree mode detection.

### Natural Usage Examples

```
/speclife start "resume fix-release-and-init"
/speclife start "continue working on add-oauth-login"
/speclife start "pick up add-oauth-login in a branch"
/speclife start "implement fix-email-validation"
```

### Enhanced Mode Detection

| Phrase in input | Meaning |
|-----------------|---------|
| "resume", "continue", "pick up" | Use existing proposal (error if not found) |
| "implement <id>" | Use existing if found, create new otherwise |
| "in a branch", "branch only" | Branch-only mode |
| "in a worktree", "with worktree" | Worktree mode |
| None of above | New proposal + worktree (default) |

## How

### 1. Parse Resume Intent

Extract workflow hints including resume keywords:

```typescript
function parseStartInput(input: string): {
  intent: 'resume' | 'new';
  changeId?: string;
  description?: string;
  mode: 'worktree' | 'branch';
} {
  // Detect resume intent
  const resumePatterns = /\b(resume|continue|pick up|implement)\s+([a-z0-9-]+)/i;
  const match = input.match(resumePatterns);
  
  if (match) {
    return {
      intent: 'resume',
      changeId: match[2],
      mode: detectMode(input), // existing logic
    };
  }
  
  return {
    intent: 'new',
    description: stripWorkflowHints(input),
    mode: detectMode(input),
  };
}
```

### 2. Check Proposal Existence

For resume intent:
```bash
PROPOSAL_DIR="openspec/changes/${changeId}"
if [[ ! -d "$PROPOSAL_DIR" ]]; then
  echo "❌ Proposal '${changeId}' not found"
  echo ""
  echo "Available proposals:"
  ls -1 openspec/changes/ | grep -v archive
  exit 1
fi
```

### 3. Skip Scaffolding

When resuming:
- ✓ Create branch/worktree
- ✗ Skip `/openspec-proposal` invocation
- ✓ Report location of existing proposal

### 4. Enhanced Output

**Resume (worktree):**
```
✓ Found existing proposal at openspec/changes/fix-release-and-init/
✓ Created worktree at worktrees/fix-release-and-init/
✓ Created branch spec/fix-release-and-init
ℹ️ Proposal already defined - ready to implement

Next: cd worktrees/fix-release-and-init/ then run /openspec-apply
```

**Resume (branch-only):**
```
✓ Found existing proposal at openspec/changes/add-oauth-login/
✓ Created branch spec/add-oauth-login
ℹ️ Proposal already defined - ready to implement

Next: Review the proposal, then run /openspec-apply to implement.
```

## What Changes

1. **Update `start.md`** - Add resume mode detection and workflow
2. **Documentation** - Add examples of resume usage
3. **Error handling** - List available proposals when not found

## Impact

- **Affected files:**
  - `openspec/commands/speclife/start.md` - Enhanced mode detection and workflow
  - `packages/cli/templates/commands/start.md` - Same changes (template copy)

- **No code changes needed** - This is purely workflow documentation that guides AI assistants

- **Backward compatible** - Existing usage patterns continue to work

## Out of Scope

- Auto-detection of proposals without keywords (too ambiguous)
- Listing proposals interactively (keep it simple)
- Validating proposal structure on resume (assume valid)
- Archived proposal handling (user must move from archive first)

## Benefits

1. **Natural language** - Matches how developers think and communicate
2. **Consistent** - Same pattern as existing branch/worktree detection
3. **No flags to remember** - Just describe intent verbally
4. **Flexible** - Can combine: "resume X in a branch"
5. **Smart fallback** - "implement X" works for both new and existing
6. **Enables workflows** - Planning, collaboration, review-first development

