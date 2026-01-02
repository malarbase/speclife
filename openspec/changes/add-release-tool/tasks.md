## 1. Core Types
- [x] 1.1 Add `ReleaseOptions` interface (version, dryRun, skipChangelog)
- [x] 1.2 Add `ReleaseResult` interface (version, changelog, prUrl, branch)
- [x] 1.3 Add `VersionBumpType` type (major | minor | patch)
- [x] 1.4 Add `CommitInfo` interface (sha, message, type, isBreaking)
- [x] 1.5 Export types from `packages/core/src/types.ts`

## 2. Git Tag Operations
- [x] 2.1 Add `getLatestTag()` to GitAdapter
- [x] 2.2 Add `getCommitsSince(tag)` to GitAdapter
- [x] 2.3 Add `createTag(name, message)` to GitAdapter
- [x] 2.4 Add `tagExists(name)` to GitAdapter

## 3. Version Analysis
- [x] 3.1 Create `parseConventionalCommit()` function
- [x] 3.2 Create `suggestVersionBump()` function (conventional commit-based)
- [x] 3.3 Implement pre-1.0 handling (breaking → minor)

## 4. Changelog Generation
- [x] 4.1 Create `generateChangelog()` function from commits
- [x] 4.2 Group commits by type (feat, fix, etc.)
- [x] 4.3 Format as markdown section

## 5. Release Workflow
- [x] 5.1 Create `packages/core/src/workflows/release.ts`
- [x] 5.2 Implement `getLastRelease()` via getLatestTag
- [x] 5.3 Implement `bumpPackageVersions()` for all workspace packages
- [x] 5.4 Implement release branch creation
- [x] 5.5 Implement `createReleasePR()` with changelog
- [x] 5.6 Export from `packages/core/src/workflows/index.ts`

## 6. MCP Tool
- [x] 6.1 Create `packages/mcp-server/src/tools/release.ts` with zod schema
- [x] 6.2 Implement dry-run mode showing proposed changes
- [x] 6.3 Add explicit version override option
- [x] 6.4 Register tool in `packages/mcp-server/src/tools/index.ts`
- [x] 6.5 Update speclife_merge to suggest running speclife_release

## 7. Verification
- [ ] 7.1 Build passes (`npm run build`)
- [ ] 7.2 Test: dry-run shows correct version suggestion
- [ ] 7.3 Test: explicit version creates PR with that version
- [ ] 7.4 Test: pre-1.0 breaking changes suggest minor bump
