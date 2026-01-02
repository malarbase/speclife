## 1. Types
- [ ] 1.1 Add `Release` interface to `types.ts`
- [ ] 1.2 Add `createRelease?: boolean` to `MergeOptions`
- [ ] 1.3 Add `release?: Release` to `MergeResult`

## 2. GitHub Adapter
- [ ] 2.1 Add `createRelease()` method to `GitHubAdapter` interface
- [ ] 2.2 Implement `createRelease()` using Octokit `repos.createRelease`
- [ ] 2.3 Add `createTag()` method to `GitHubAdapter` interface
- [ ] 2.4 Implement `createTag()` using Octokit `git.createTag` and `git.createRef`

## 3. Release Notes Generation
- [ ] 3.1 Create `generateReleaseNotes()` helper function
- [ ] 3.2 Extract "Why" section from proposal for summary
- [ ] 3.3 Include version analysis reasoning

## 4. Merge Workflow Integration
- [ ] 4.1 Add `createRelease` option handling (default: true when version bumped)
- [ ] 4.2 Create and push git tag after version bump commit
- [ ] 4.3 Call GitHub `createRelease()` with generated notes
- [ ] 4.4 Add `release` to `MergeResult`
- [ ] 4.5 Add progress callbacks for release creation steps

## 5. MCP Tool Update
- [ ] 5.1 Add `createRelease` parameter to `speclife_merge` schema
- [ ] 5.2 Pass option through to workflow
- [ ] 5.3 Display release URL in success output

## 6. Testing
- [ ] 6.1 Add unit tests for `createRelease()` adapter method
- [ ] 6.2 Add unit tests for `generateReleaseNotes()`
- [ ] 6.3 Add integration test for merge-with-release flow
