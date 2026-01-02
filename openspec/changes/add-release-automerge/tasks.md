# Tasks: Add Auto-Merge for Release PRs

## Implementation Tasks

- [x] Add `enableAutoMerge()` method to GitHubAdapter interface and implementation
- [x] Add `autoMerge` option to ReleaseOptions type
- [x] Add `autoMergeEnabled` to ReleaseResult type
- [x] Update releaseWorkflow to call enableAutoMerge when requested
- [x] Update merge.ts to pass autoMerge=true for patch/minor releases
- [x] Update release.ts tool to support autoMerge option
- [x] Add enableAutoMerge mock to test helpers
- [x] Build and verify all tests pass

