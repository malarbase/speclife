## 1. Core Types & Config
- [ ] 1.1 Add `versionBump` option to `MergeOptions` in `types.ts` (with 'auto' default)
- [ ] 1.2 Add `VersionAnalysis` type: `{ bump: 'patch'|'minor'|'major', reasoning: string }`

## 2. AI Version Analysis
- [ ] 2.1 Add `analyzeVersionBump(proposal, diff)` method to AI adapter interface
- [ ] 2.2 Implement version analysis in `claude-cli-adapter.ts`
- [ ] 2.3 Implement version analysis in `claude-sdk-adapter.ts`
- [ ] 2.4 Create version analysis prompt template

## 3. Merge Workflow Integration
- [ ] 3.1 Add `determineVersionBump()` function to analyze change before merge
- [ ] 3.2 Fetch PR diff via GitHub adapter
- [ ] 3.3 Read proposal via OpenSpec adapter
- [ ] 3.4 Return analysis result with reasoning to caller

## 4. Version Bump Execution
- [ ] 4.1 Create `bumpVersion()` helper to run `npm version`
- [ ] 4.2 Commit version bump with `chore: release vX.Y.Z` message
- [ ] 4.3 Push version commit to main after merge

## 5. MCP Tool Update
- [ ] 5.1 Update `speclife_merge` tool schema with `versionBump` parameter
- [ ] 5.2 Return version analysis in tool response for user confirmation
- [ ] 5.3 Handle explicit override when user specifies non-'auto' value

## 6. Testing
- [ ] 6.1 Add unit tests for `analyzeVersionBump()` with mock AI responses
- [ ] 6.2 Add unit tests for `bumpVersion()` helper
- [ ] 6.3 Add integration test for full merge-with-bump flow

## 7. Documentation
- [ ] 7.1 Update README with AI-driven version bump feature
- [ ] 7.2 Document version analysis guidelines in AGENTS.md
