## 1. Core Types
- [x] 1.1 Add `generateTasks` option to `InitOptions` interface
- [x] 1.2 Add `tasksGenerated` and `tasksPreview` to `InitResult`
- [x] 1.3 Export types from `packages/core/src/types.ts`

## 2. Task Generation Prompt
- [x] 2.1 Add `generateTaskGenerationPrompt()` to claude-cli-adapter
- [x] 2.2 Add `parseTaskGenerationResponse()` to parse AI output
- [x] 2.3 Export new functions from adapters/index.ts

## 3. Init Workflow Enhancement
- [x] 3.1 Modify `initWorkflow` to accept `generateTasks` option
- [x] 3.2 Add `generateTasksWithAI` helper function
- [x] 3.3 Check Claude CLI availability before generation
- [x] 3.4 Write generated tasks to tasks.md

## 4. MCP Tool Update
- [x] 4.1 Add `generateTasks` boolean to init tool schema
- [x] 4.2 Update tool description to mention task generation
- [x] 4.3 Display generated tasks preview in tool output

## 5. Verification
- [x] 5.1 Build passes (`npm run build`)
- [x] 5.2 All existing tests pass
