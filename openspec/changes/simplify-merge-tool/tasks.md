# Tasks: Simplify speclife_merge Tool

## Implementation Tasks

- [x] Remove auto-release logic from `packages/mcp-server/src/tools/merge.ts`
  - Remove release analysis code (lines 88-167)
  - Remove imports: `releaseWorkflow`, `suggestVersionBump`, `parseConventionalCommit`, `isAutoReleaseAllowed`, `CommitInfo`
  - Keep simple success message with hint to use `speclife_release`

- [x] Remove `ReleaseAutoConfig` from `packages/core/src/config.ts`
  - Remove `ReleaseAutoConfig` interface
  - Remove `ReleaseConfig` interface  
  - Remove `release` from `SpecLifeConfig`
  - Remove release defaults
  - Remove `isAutoReleaseAllowed` function

- [x] Update `packages/core/src/index.ts`
  - Remove exports: `ReleaseAutoConfig`, `ReleaseConfig`, `isAutoReleaseAllowed`

- [x] Verify build and tests pass

