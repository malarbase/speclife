## 1. Types
- [x] 1.1 Add `Release` interface to `types.ts`
- [x] 1.2 Add `createRelease?: boolean` to `MergeOptions`
- [x] 1.3 Add `release?: Release` to `MergeResult`

## 2. GitHub Adapter
- [x] 2.1 Add `createRelease()` method to `GitHubAdapter` interface
- [x] 2.2 Implement `createRelease()` using Octokit `repos.createRelease`
- [x] 2.3 Add `createTag()` method to `GitHubAdapter` interface
- [x] 2.4 Implement `createTag()` using Octokit `git.createTag` and `git.createRef`

## 3. Release Notes Generation
- [x] 3.1 Create `generateReleaseNotes()` helper function
- [x] 3.2 Extract "Why" section from proposal for summary
- [x] 3.3 Include version analysis reasoning

## 4. Merge Workflow Integration
- [x] 4.1 Add `createRelease` option handling (default: true when version bumped)
- [x] 4.2 Create and push git tag after version bump commit
- [x] 4.3 Call GitHub `createRelease()` with generated notes
- [x] 4.4 Add `release` to `MergeResult`
- [x] 4.5 Add progress callbacks for release creation steps

## 5. MCP Tool Update
- [x] 5.1 Add `createRelease` parameter to `speclife_merge` schema
- [x] 5.2 Pass option through to workflow
- [x] 5.3 Display release URL in success output

## 6. Testing
- [ ] 6.1 Add unit tests for `createRelease()` adapter method
- [ ] 6.2 Add unit tests for `generateReleaseNotes()`
- [ ] 6.3 Add integration test for merge-with-release flow
