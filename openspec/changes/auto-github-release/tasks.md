## 1. Remove Version Bump from Merge Workflow
- [x] 1.1 Remove `versionBump` option from `MergeOptions`
- [x] 1.2 Remove `versionAnalysis`, `newVersion` from `MergeResult`
- [x] 1.3 Remove `analyzeVersionBump()` function
- [x] 1.4 Remove `bumpVersion()` function
- [x] 1.5 Remove `generateReleaseNotes()` and `extractWhySection()` functions
- [x] 1.6 Remove version bump execution logic from `mergeWorkflow()`

## 2. Remove Release Creation from Merge Workflow
- [x] 2.1 Remove `createRelease` option from `MergeOptions`
- [x] 2.2 Remove `release` from `MergeResult`
- [x] 2.3 Remove release creation logic from `mergeWorkflow()`

## 3. Clean Up GitHub Adapter
- [x] 3.1 Remove `createRelease()` method from `GitHubAdapter`
- [x] 3.2 Remove `createTag()` method from `GitHubAdapter`

## 4. Clean Up Types
- [x] 4.1 Remove `Release` interface from `types.ts`
- [x] 4.2 Remove `VersionBumpType`, `VersionAnalysis`, `VersionBumpOption` from `types.ts`

## 5. Update MCP Tool
- [x] 5.1 Remove `versionBump` parameter from `speclife_merge` schema
- [x] 5.2 Remove `createRelease` parameter from schema
- [x] 5.3 Update output message to indicate CI handles releases
- [x] 5.4 Remove unused adapter creation (claudeCli, openspec for version analysis)

## 6. Add GitHub Action for Releases
- [x] 6.1 Create `.github/workflows/release.yml` with release-please
- [x] 6.2 Add `release-please-config.json` for monorepo configuration
- [x] 6.3 Add `.release-please-manifest.json` with current version
