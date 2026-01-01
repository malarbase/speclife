## 1. Core Types & Interface
- [x] 1.1 Define `ImplementMode` type: `'claude-cli' | 'claude-sdk' | 'cursor'`
- [x] 1.2 Define `ImplementOptions` with `mode`, `changeId`, `taskId?`, `dryRun?`
- [x] 1.3 Define `ImplementResult` with status, output, tasksCompleted
- [x] 1.4 Add `implementMode` to config schema in `config.ts`

## 2. Claude CLI Adapter (Primary Mode)
- [x] 2.1 Create `packages/core/src/adapters/claude-cli-adapter.ts`
- [x] 2.2 Implement `isClaudeCliAvailable()` - check if `claude` binary exists
- [x] 2.3 Implement `runClaudeCli(prompt, cwd, options)` - spawn claude process
- [x] 2.4 Generate implementation prompt from proposal/tasks/context
- [x] 2.5 Handle streaming output from claude CLI
- [x] 2.6 Export from `packages/core/src/adapters/index.ts`

## 3. Claude SDK Adapter (Automated Mode)
- [x] 3.1 Create `packages/core/src/adapters/claude-sdk-adapter.ts`
- [x] 3.2 Define file operation tools (read, write, edit)
- [x] 3.3 Define shell execution tool (run tests, build)
- [x] 3.4 Implement `runAgenticLoop(prompt, tools, maxIterations)`
- [x] 3.5 Handle tool execution and response chaining
- [x] 3.6 Export from `packages/core/src/adapters/index.ts`

## 4. Cursor Adapter
- [x] 4.1 Create `packages/core/src/adapters/cursor-adapter.ts`
- [x] 4.2 Implement `isCursorAvailable()` - check if `cursor` binary exists
- [x] 4.3 Implement `openCursor(worktreePath)` - spawn Cursor process
- [x] 4.4 Export from `packages/core/src/adapters/index.ts`

## 5. Implement Workflow
- [x] 5.1 Create `packages/core/src/workflows/implement.ts`
- [x] 5.2 Implement context gathering (read proposal, tasks, affected files)
- [x] 5.3 Implement mode dispatcher (route to appropriate adapter)
- [x] 5.4 Implement test runner integration for claude-sdk mode
- [x] 5.5 Implement fix loop (analyze failure, regenerate, retry up to 3x)
- [x] 5.6 Implement task completion (update tasks.md checkbox)
- [x] 5.7 Add dry-run mode (return plan without executing)
- [x] 5.8 Add single-task mode (implement specific taskId)
- [x] 5.9 Export from `packages/core/src/workflows/index.ts`

## 6. MCP Tool
- [x] 6.1 Create `packages/mcp-server/src/tools/implement.ts` with zod schema
- [x] 6.2 Add `mode` parameter to tool schema
- [x] 6.3 Implement `registerImplementTool` function
- [x] 6.4 Emit progress events during long-running implementation
- [x] 6.5 Handle partial success (some tasks complete, some failed)
- [x] 6.6 Register tool in `packages/mcp-server/src/tools/index.ts`

## 7. Verification
- [x] 7.1 Build passes (`npm run build`)
- [ ] 7.2 Test claude-cli mode: verify prompt generation and CLI invocation
- [ ] 7.3 Test claude-sdk mode: verify agentic loop with test runner
- [ ] 7.4 Test cursor mode: verify Cursor opens in correct directory
- [ ] 7.5 Test dry-run mode returns correct plan for each mode
