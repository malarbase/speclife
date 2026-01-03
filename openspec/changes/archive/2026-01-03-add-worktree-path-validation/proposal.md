# Add Worktree Path Validation

## Why

During implementation of `add-verbal-resume-support`, all file edits were made in the main repository instead of the worktree. This happened because AI assistants lack context awareness about which directory they should be working in.

**Impact**: Workflow confusion, dirty git state in wrong location, manual recovery needed, potential for committing to wrong branch.

**Root cause**: No validation or documentation enforcing that worktree file operations must use worktree paths, not main repo paths. The AI must manually track the correct path prefix, which is error-prone.

## What

Add multiple layers of validation to prevent file operations in the wrong location:

1. **Enhance `/openspec-apply`**: Detect and validate working directory context
2. **Update `/speclife start` output**: More explicit instructions about path requirements
3. **Add worktree guards to AGENTS.md**: Document the critical rule
4. **Validation before writes**: Check path consistency with current branch/worktree

## How

### 1. Enhance `/openspec-apply` Command

Add context validation step at the beginning:

```markdown
## ⚡ Execution

**BEFORE starting implementation:**

### Step 0: Validate Working Directory Context

Check if we're in the correct location for this change:

```bash
BRANCH=$(git branch --show-current)
CURRENT_DIR=$(pwd)

# Check if this is a spec branch
if [[ $BRANCH == spec/* ]]; then
  CHANGE_ID=${BRANCH#spec/}
  
  # Check if we're in a worktree
  if [[ -f .git ]] && grep -q "gitdir:" .git; then
    echo "✓ Working in worktree: $CURRENT_DIR"
    WORK_ROOT=$CURRENT_DIR
  else
    # Check if worktree exists
    WORKTREE_PATH="worktrees/$CHANGE_ID"
    if [[ -d "../$WORKTREE_PATH" ]] || [[ -d "$WORKTREE_PATH" ]]; then
      echo "❌ ERROR: Worktree exists but you're in main repo!"
      echo "   You must cd to worktrees/$CHANGE_ID/ first"
      echo "   All file edits must happen in the worktree."
      exit 1
    else
      echo "✓ Branch-only mode - working in main repo"
      WORK_ROOT=$(git rev-parse --show-toplevel)
    fi
  fi
else
  WORK_ROOT=$(git rev-parse --show-toplevel)
fi

echo "📍 Working from: $WORK_ROOT"
echo "⚠️  All file operations must use this as base path"
```

**CRITICAL:** All subsequent file operations must use `$WORK_ROOT` as the base.
```

### 2. Update `/speclife start` Output

Make the worktree instructions more directive:

**Current:**
```
Next: cd worktrees/add-oauth-login/ then run /openspec-apply.
```

**Enhanced:**
```
⚠️  IMPORTANT: You must work from the worktree directory!

Next steps:
1. Switch to worktree: cd worktrees/add-oauth-login/
2. Invoke /openspec-apply from there

🚨 CRITICAL: All file edits MUST happen in:
   worktrees/add-oauth-login/...

   NOT in the main repo!
```

### 3. Add Guard Rules to AGENTS.md

Add a dedicated section:

```markdown
## 🚨 CRITICAL: Working with Worktrees

**The #1 rule when working on spec branches in worktrees:**

### All File Edits Must Use Worktree Paths

When implementing a change in a worktree:

✅ **CORRECT paths:**
```
/Users/.../project/worktrees/add-feature/openspec/commands/...
/Users/.../project/worktrees/add-feature/packages/core/...
```

❌ **WRONG paths:**
```
/Users/.../project/openspec/commands/...  ← Main repo!
/Users/.../project/packages/core/...      ← Main repo!
```

### Detection and Validation

**BEFORE making ANY file edits:**

1. Run `pwd` mentally - verify path contains `worktrees/<change-id>`
2. Check current branch: `git branch --show-current` matches your change
3. Verify first file operation uses worktree prefix
4. If path looks wrong: STOP and ask user to confirm location

### If You Realize You're in the Wrong Location

**STOP IMMEDIATELY** and notify the user:
```
❌ Error: I'm about to edit files in the main repo, but there's a worktree.
   All changes should happen in: worktrees/<change-id>/
   
   Please confirm: Should I continue in main repo or switch to worktree?
```

### How to Verify

Each file operation should pass this check:
```typescript
const isInWorktree = currentPath.includes(`worktrees/${changeId}/`);
const shouldBeInWorktree = branch.startsWith('spec/') && worktreeExists;

if (shouldBeInWorktree && !isInWorktree) {
  ERROR: "Wrong location! Use worktree path."
}
```

### Why This Matters

- **Worktrees enable parallel work** - changes must be isolated
- **Git state integrity** - main branch should stay clean
- **Workflow correctness** - changes belong to their branch
- **User expectations** - if they created a worktree, use it
```

### 4. Add Path Validation Reminder

Update the `/openspec-apply` command steps section:

```markdown
## Steps

Track these steps as TODOs and complete them one by one.

### 0. 🚨 Validate Working Location

**MANDATORY FIRST STEP:**

Check that you're in the correct directory for this change:
- If worktree exists → you MUST be in `worktrees/<change-id>/`
- If branch-only → you should be in main repo root
- All subsequent file paths must start from this location

**Validation command:**
```bash
pwd  # Should show worktree path if worktree exists
git branch --show-current  # Should match your change
```

If mismatch detected: STOP and ask user before proceeding.

### 1. Read proposal and tasks
...
```

## What Changes

### Files to Update

1. **`openspec/commands/speclife/start.md`**
   - Enhance Step 4 "Report and STOP" with explicit worktree path warnings
   - Add visual emphasis (🚨) to critical instructions

2. **`.cursor/commands/openspec-apply.md`** (and `.claude/` equivalent)
   - Add Step 0: Validate Working Directory Context
   - Include bash script for detection
   - Add error cases and remediation

3. **`openspec/AGENTS.md`**
   - Add new section: "🚨 CRITICAL: Working with Worktrees"
   - Document path validation rules
   - Add detection checklist
   - Provide error handling guidance

4. **`packages/cli/templates/commands/start.md`**
   - Mirror changes from `openspec/commands/speclife/start.md`

## Impact

### Benefits

1. **Prevents path confusion** - Clear validation before any edits
2. **Early error detection** - Fail fast if in wrong location  
3. **Better UX** - Explicit instructions reduce ambiguity
4. **Documentation** - Permanent guard rails in AGENTS.md
5. **Confidence** - AI and users both know they're in the right place

### Backward Compatibility

- ✅ No breaking changes - pure additions
- ✅ Branch-only mode works as before
- ✅ Main repo work (non-spec branches) unaffected
- ✅ Only adds validation, doesn't change behavior

## Out of Scope

- Automatic path correction (too risky)
- Filesystem watchers (complexity)
- IDE integration (out of control)
- Retroactive fixes for past issues

## Acceptance Criteria

- [ ] `/openspec-apply` validates location before starting
- [ ] `/speclife start` includes explicit worktree path warnings
- [ ] `AGENTS.md` documents the worktree path rule
- [ ] Error messages guide user to correct location
- [ ] Validation works for both worktree and branch-only modes
- [ ] No false positives (correctly handles legitimate main repo work)

