## 1. Core Types
- [x] 1.1 Add `ChangeListItem` interface (id, progress, prStatus, lastActive)
- [x] 1.2 Add `ListOptions` interface (compact, status, sort)
- [x] 1.3 Add `ChangeProgress` interface (completed, total, percentage)
- [x] 1.4 Export types from `packages/core/src/types.ts`

## 2. Progress Calculation
- [x] 2.1 Create `calculateProgress()` function to parse tasks.md
- [x] 2.2 Handle nested tasks and subtasks
- [x] 2.3 Add progress calculation to status workflow

## 3. PR Status Integration
- [x] 3.1 Add `getPRStatus()` helper to look up PR by branch
- [x] 3.2 Implement PR status lookup (draft, ready, merged)
- [x] 3.3 Handle GitHub errors gracefully (fallback to "local")

## 4. Display Formatting
- [x] 4.1 Create `formatProgressBar()` function (ASCII progress bar)
- [x] 4.2 Create `formatRelativeTime()` function (e.g., "2 hours ago")
- [x] 4.3 Create `formatTable()` function for tabular output
- [x] 4.4 Create `formatCompactLine()` function for single-line output

## 5. List Workflow Enhancement
- [x] 5.1 Modify list workflow to collect enriched data for each change
- [x] 5.2 Add sorting options (activity, progress, name)
- [x] 5.3 Add filtering options (status)
- [x] 5.4 Add summary statistics

## 6. MCP Tool Update
- [x] 6.1 Add `compact`, `status`, `sort` options to list tool schema
- [x] 6.2 Update tool output to use new formatting
- [x] 6.3 Handle empty list gracefully

## 7. Verification
- [x] 7.1 Build passes (`npm run build`)
- [x] 7.2 All existing tests pass
