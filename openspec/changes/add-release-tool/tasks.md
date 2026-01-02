## 1. Core Types
- [ ] 1.1 Add `ReleaseOptions` interface (version, dryRun, skipChangelog)
- [ ] 1.2 Add `ReleaseResult` interface (version, changelog, prUrl, branch)
- [ ] 1.3 Add `VersionBumpType` type (major | minor | patch)
- [ ] 1.4 Add `CommitInfo` interface (sha, message, type, isBreaking)
- [ ] 1.5 Export types from `packages/core/src/types.ts`

## 2. Git Tag Operations
- [ ] 2.1 Add `getLatestTag()` to GitAdapter
- [ ] 2.2 Add `getCommitsSince(tag)` to GitAdapter
- [ ] 2.3 Add `createTag(name, message)` to GitAdapter

## 3. Version Analysis
- [ ] 3.1 Create `parseConventionalCommit()` function
- [ ] 3.2 Create `suggestVersionBump()` function (conventional commit-based)
- [ ] 3.3 Add `generateVersionAnalysisPrompt()` to claude-cli-adapter
- [ ] 3.4 Add `parseVersionAnalysisResponse()` for AI suggestions
- [ ] 3.5 Implement pre-1.0 handling (breaking → minor)

## 4. Changelog Generation
- [ ] 4.1 Create `generateChangelog()` function from commits
- [ ] 4.2 Group commits by type (feat, fix, etc.)
- [ ] 4.3 Format as markdown section

## 5. Release Workflow
- [ ] 5.1 Create `packages/core/src/workflows/release.ts`
- [ ] 5.2 Implement `getLastRelease()` to find latest tag
- [ ] 5.3 Implement `bumpPackageVersions()` for all workspace packages
- [ ] 5.4 Implement `createReleaseBranch()` 
- [ ] 5.5 Implement `createReleasePR()` with changelog
- [ ] 5.6 Export from `packages/core/src/workflows/index.ts`

## 6. MCP Tool
- [ ] 6.1 Create `packages/mcp-server/src/tools/release.ts` with zod schema
- [ ] 6.2 Implement dry-run mode showing proposed changes
- [ ] 6.3 Add explicit version override option
- [ ] 6.4 Add AI confirmation flow for suggested version
- [ ] 6.5 Register tool in `packages/mcp-server/src/tools/index.ts`

## 7. CI Integration
- [ ] 7.1 Update publish.yml to handle release PR merges (tag + release creation)

## 8. Verification
- [ ] 8.1 Build passes (`npm run build`)
- [ ] 8.2 Test: dry-run shows correct version suggestion
- [ ] 8.3 Test: explicit version creates PR with that version
- [ ] 8.4 Test: pre-1.0 breaking changes suggest minor bump
