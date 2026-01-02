## 1. Core Types
- [x] 1.1 Add `ReleaseOptions` interface (version, dryRun, skipChangelog)
- [x] 1.2 Add `ReleaseResult` interface (version, changelog, prUrl, branch)
- [x] 1.3 Add `VersionBumpType` type (major | minor | patch)
- [x] 1.4 Add `CommitInfo` interface (sha, message, type, isBreaking)
- [x] 1.5 Export types from `packages/core/src/types.ts`

## 2. Release Configuration
- [x] 2.1 Add `ReleaseAutoConfig` interface (patch, minor, major booleans)
- [x] 2.2 Add `ReleaseConfig` interface to SpecLifeConfig
- [x] 2.3 Add `isAutoReleaseAllowed()` helper function
- [x] 2.4 Set defaults: patch=true, minor=true, major=false

## 3. Git Tag Operations
- [x] 3.1 Add `getLatestTag()` to GitAdapter
- [x] 3.2 Add `getCommitsSince(tag)` to GitAdapter
- [x] 3.3 Add `createTag(name, message)` to GitAdapter
- [x] 3.4 Add `tagExists(name)` to GitAdapter

## 4. Version Analysis
- [x] 4.1 Create `parseConventionalCommit()` function
- [x] 4.2 Create `suggestVersionBump()` function (conventional commit-based)
- [x] 4.3 Create `bumpVersion()` function
- [x] 4.4 Implement pre-1.0 handling (breaking → minor)

## 5. Changelog Generation
- [x] 5.1 Create `generateChangelog()` function from commits
- [x] 5.2 Group commits by type (feat, fix, breaking, other)
- [x] 5.3 Format as markdown section

## 6. Release Workflow
- [x] 6.1 Create `packages/core/src/workflows/release.ts`
- [x] 6.2 Implement version analysis with tag lookup
- [x] 6.3 Implement `bumpPackageVersions()` for all workspace packages
- [x] 6.4 Implement release branch creation
- [x] 6.5 Implement release PR creation with changelog
- [x] 6.6 Export from `packages/core/src/workflows/index.ts`

## 7. MCP Release Tool
- [x] 7.1 Create `packages/mcp-server/src/tools/release.ts` with zod schema
- [x] 7.2 Implement dry-run mode showing proposed changes
- [x] 7.3 Add explicit version override option
- [x] 7.4 Add `--major`, `--minor`, `--patch` flags
- [x] 7.5 Register tool in `packages/mcp-server/src/tools/index.ts`

## 8. Auto-Release in Merge
- [x] 8.1 Update `MergeResult` to include `repoPath`
- [x] 8.2 Add auto-release logic to `speclife_merge` tool
- [x] 8.3 Check `isAutoReleaseAllowed()` before auto-releasing
- [x] 8.4 Block major bumps with helpful message
- [x] 8.5 Add `--skipRelease` flag to bypass auto-release

## 9. Verification
- [ ] 9.1 Build passes (`npm run build`)
- [ ] 9.2 Test: auto-release triggers for minor bump
- [ ] 9.3 Test: auto-release blocked for major bump
- [ ] 9.4 Test: `--major` flag forces major version
- [ ] 9.5 Test: pre-1.0 breaking changes suggest minor bump
