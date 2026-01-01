## Why

SpecLife has `speclife_init` and `speclife_submit`, but lacks the final step: **merging PRs and cleaning up**. Currently users must manually:
1. Merge the PR on GitHub
2. Pull changes to main
3. Remove the worktree
4. Delete the local branch

This breaks the seamless AI-driven workflow. The `speclife_merge` tool completes Phase 2 by automating the entire post-PR lifecycle.

## What Changes

1. **New workflow:** `mergeWorkflow` in `packages/core/src/workflows/merge.ts`
2. **New MCP tool:** `speclife_merge` in `packages/mcp-server/src/tools/merge.ts`
3. **GitHub integration:** Merge PR via API (squash/merge/rebase options)
4. **Worktree cleanup:** Remove worktree after successful merge
5. **Main sync:** Pull latest main after merge

## Scenarios (from spec)

| Scenario | Behavior |
|----------|----------|
| Merge and cleanup | Merge PR → checkout main → pull → delete branch → remove worktree |
| Squash merge | Use `--squash` merge method on GitHub |
| PR not ready | Error with status details (failing checks, pending reviews) |
| Worktree cleanup | Remove worktree directory and prune references |

## Impact

- Affected specs: `openspec/specs/mcp-server/spec.md` (Merge Tool requirement)
- Affected code:
  - `packages/core/src/workflows/merge.ts` (new)
  - `packages/mcp-server/src/tools/merge.ts` (new)
  - `packages/core/src/workflows/index.ts` (export)
  - `packages/mcp-server/src/tools/index.ts` (register)
