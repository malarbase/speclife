## 1. Core Workflow
- [x] 1.1 Create `MergeOptions` and `MergeResult` types
- [x] 1.2 Implement `mergeWorkflow` function
- [x] 1.3 Add PR merge via GitHubAdapter (squash/merge/rebase methods)
- [x] 1.4 Add PR readiness check (CI status, reviews, conflicts)
- [x] 1.5 Add worktree detection and cleanup
- [x] 1.6 Add main branch sync (checkout + pull)
- [x] 1.7 Add local branch deletion
- [x] 1.8 Export from `packages/core/src/workflows/index.ts`

## 2. MCP Tool
- [x] 2.1 Create `packages/mcp-server/src/tools/merge.ts` with zod schema
- [x] 2.2 Implement `registerMergeTool` function
- [x] 2.3 Handle edge cases: PR not found, not mergeable, already merged
- [x] 2.4 Register tool in `packages/mcp-server/src/tools/index.ts`

## 3. Verification
- [x] 3.1 Build passes (`npm run build`)
- [ ] 3.2 Manual test: merge PR, verify worktree removed, main updated
