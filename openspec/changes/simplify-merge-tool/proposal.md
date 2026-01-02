# Simplify speclife_merge Tool

## Summary

Remove auto-release logic from `speclife_merge` to follow single-responsibility principle. The merge tool should only merge PRs and cleanup; `speclife_release` handles releases explicitly.

## Problem

The current `speclife_merge` implementation:
1. Merges the PR
2. Syncs main branch  
3. Cleans up worktree
4. **Then** analyzes commits for release
5. **Potentially** creates a release PR automatically

This causes issues:
- **Timing bug**: Worktree is deleted before response is returned. If Cursor's MCP connection is disrupted during the release analysis phase (80+ lines of async work), the call shows as "cancelled" even though the merge succeeded.
- **Over-complexity**: Added ~80 lines of release logic + config options (`release.auto.patch/minor/major`)
- **Implicit behavior**: Auto-releasing after merge is surprising; explicit is better for releases
- **Single-responsibility violation**: Merge and release are separate concerns

## Solution

Simplify `speclife_merge` to do one thing well:
1. Merge PR
2. Sync main branch
3. Cleanup worktree/branch
4. Return success with hint to use `speclife_release`

Remove:
- Auto-release analysis logic from merge tool
- `ReleaseAutoConfig` and related config options
- `skipRelease` parameter from merge

Keep:
- `speclife_release` as the explicit tool for creating releases
- All release workflow logic (just not triggered from merge)

## Benefits

1. **Robust**: No timing window where files disappear before MCP response
2. **Faster**: Merge completes quickly without release analysis delay
3. **Predictable**: User knows exactly what merge does
4. **Simpler code**: Remove ~100 lines of complexity
5. **Better UX**: Explicit release decisions instead of auto-magic

## Migration

No migration needed - this is removing implicit behavior. Users who want to release after merge simply run `speclife_release` explicitly.

## Files to Modify

- `packages/mcp-server/src/tools/merge.ts` - Remove auto-release logic (~80 lines)
- `packages/core/src/config.ts` - Remove `ReleaseAutoConfig` type and defaults
- `packages/core/src/index.ts` - Remove config exports
- `packages/core/src/workflows/merge.ts` - Remove release-related imports (already clean)

