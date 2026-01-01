## Why

After merging a PR with `speclife_merge`, the worktree is not automatically cleaned up. This leaves stale worktrees that users must manually remove.

**Root cause:** The merge workflow checks if we're "in" a worktree by comparing `currentBranch` to the merge branch. But when MCP tools run from the main repo, `currentBranch` is `main`, not the feature branch, so worktree detection fails.

## What Changes

Fix the worktree detection logic in `mergeWorkflow` to:
1. Find worktrees by matching branch name (not current directory)
2. Always attempt cleanup if a matching worktree exists
3. Handle the case where worktree path contains the branch name

## Current (Broken)

```typescript
for (const wt of worktrees) {
  if (wt.branch === currentBranch || wt.branch === branch) {
    worktreePath = wt.path;
    isInWorktree = worktrees.length > 1;
    break;
  }
}
// Only removes if isInWorktree is true
```

## Fixed

```typescript
for (const wt of worktrees) {
  if (wt.branch === branch) {
    worktreePath = wt.path;
    break;
  }
}
// Always attempt removal if worktreePath found
if (removeWorktree && worktreePath) {
  await git.removeWorktree(worktreePath);
}
```

## Impact

- Affected code: `packages/core/src/workflows/merge.ts`
