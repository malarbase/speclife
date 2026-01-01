## 1. Core Workflow
- [ ] 1.1 Create `SubmitOptions` and `SubmitResult` types
- [ ] 1.2 Implement `submitWorkflow` function with git add, commit, push
- [ ] 1.3 Add PR creation using GitHubAdapter
- [ ] 1.4 Add change archiving after successful PR creation
- [ ] 1.5 Handle edge cases: nothing to commit, PR already exists
- [ ] 1.6 Export from `packages/core/src/workflows/index.ts`

## 2. MCP Tool
- [ ] 2.1 Create `packages/mcp-server/src/tools/submit.ts` with zod schema
- [ ] 2.2 Implement `registerSubmitTool` function
- [ ] 2.3 Register tool in `packages/mcp-server/src/tools/index.ts`

## 3. Verification
- [ ] 3.1 Build passes (`npm run build`)
- [ ] 3.2 Manual test: create change, make edits, submit PR
