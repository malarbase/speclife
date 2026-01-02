## Why

Currently `speclife_list` shows minimal information about active changes:
- Just the change IDs
- No task progress
- No PR status
- No last activity timestamp

Users need to run `speclife_status` on each change individually to get useful information.

## What Changes

1. **Enhanced output:** Show task progress, PR status, and timestamps
2. **Visual progress bars:** ASCII progress indicators for task completion
3. **Status indicators:** Draft, ready, merged, needs attention
4. **Sorting options:** By last activity, by progress, by PR status

## User Experience

```
> speclife_list

Active Changes:
┌─────────────────────────────────┬────────────────┬─────────────┬──────────────┐
│ Change                          │ Progress       │ PR Status   │ Last Active  │
├─────────────────────────────────┼────────────────┼─────────────┼──────────────┤
│ add-oauth                       │ ████████░░ 8/10│ #42 (draft) │ 2 hours ago  │
│ fix-login-redirect              │ ██████████ 6/6 │ #43 (ready) │ 1 day ago    │
│ add-metrics                     │ ██░░░░░░░░ 2/10│ local only  │ 3 days ago   │
│ refactor-config                 │ ░░░░░░░░░░ 0/5 │ #44 (draft) │ 1 week ago   │
└─────────────────────────────────┴────────────────┴─────────────┴──────────────┘

Summary: 4 changes, 2 with PRs ready for review
```

### Compact Mode
```
> speclife_list --compact

add-oauth         [■■■■■■■■░░] 8/10  PR #42 (draft)   2h ago
fix-login-redirect[■■■■■■■■■■] 6/6   PR #43 (ready)   1d ago
add-metrics       [■■░░░░░░░░] 2/10  local            3d ago
refactor-config   [░░░░░░░░░░] 0/5   PR #44 (draft)   1w ago
```

### Filtered List
```
> speclife_list --status=ready

Changes ready for review:
- fix-login-redirect  PR #43  6/6 tasks complete
```

## Scenarios

| Scenario | Behavior |
|----------|----------|
| No changes | "No active changes" message |
| Many changes | Paginate or scroll |
| `--compact` | Single-line per change |
| `--status=X` | Filter by PR status |
| `--sort=activity` | Sort by last modification |
| `--sort=progress` | Sort by task completion % |

## Implementation Approach

### Data Collection
For each change:
1. Read tasks.md and count checked/unchecked items
2. Check for associated PR via branch name
3. Get PR status from GitHub API
4. Get last commit timestamp

### Progress Calculation
```typescript
interface ChangeProgress {
  completed: number;
  total: number;
  percentage: number;
}

function calculateProgress(tasksContent: string): ChangeProgress {
  const completed = (tasksContent.match(/- \[x\]/gi) || []).length;
  const total = (tasksContent.match(/- \[[ x]\]/gi) || []).length;
  return { completed, total, percentage: total ? (completed / total) * 100 : 0 };
}
```

### Display Formatting
- Use Unicode box drawing for table borders
- Use block characters (█░) for progress bars
- Color coding: green (ready), yellow (draft), red (needs attention)

## Impact

- Modified files:
  - `packages/core/src/workflows/status.ts` (add progress calculation)
  - `packages/core/src/types.ts` (add ChangeListItem type)
  - `packages/mcp-server/src/tools/list.ts` (enhanced output)

## Open Questions

1. Should we cache PR status to avoid rate limits?
2. Should colors be used (may not render in all MCP clients)?
3. How to handle very long change names (truncate)?
