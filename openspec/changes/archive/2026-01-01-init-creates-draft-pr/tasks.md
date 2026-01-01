## 1. Init Workflow Updates
- [x] 1.1 Add initial commit after scaffolding (proposal.md + tasks.md)
- [x] 1.2 Add push to origin after commit
- [x] 1.3 Add draft PR creation using GitHubAdapter
- [x] 1.4 Generate PR title and body from changeId and description
- [x] 1.5 Return PR URL in `InitResult`
- [x] 1.6 Add `skipDraftPR` option for opt-out

## 2. Submit Workflow Updates
- [x] 2.1 Check if PR already exists for branch
- [x] 2.2 If exists: push changes + mark ready (`gh pr ready`)
- [x] 2.3 If not exists: create PR (backwards compatibility)
- [x] 2.4 Update return type to indicate PR was marked ready vs created

## 3. Config Updates
- [x] 3.1 Add `createDraftPR: boolean` to config schema (default: true)
- [x] 3.2 Respect config in initWorkflow

## 4. MCP Tool Updates
- [x] 4.1 Update init tool response to include PR URL
- [x] 4.2 Update submit tool response for "marked ready" case

## 5. Verification
- [x] 5.1 Build passes (`npm run build`)
- [ ] 5.2 Test: init creates draft PR with proposal
- [ ] 5.3 Test: submit marks existing PR ready
- [ ] 5.4 Test: skipDraftPR option works
