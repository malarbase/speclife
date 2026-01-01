## Why

Currently, `speclife_init` creates a worktree and branch but no PR. The PR is only created when `speclife_submit` is called after implementation. This delays visibility:

- Team doesn't see work in progress
- No early feedback on proposals
- PRs appear "out of nowhere" when complete

Many teams prefer **draft PRs created early** so stakeholders can:
- See what's being worked on
- Review proposals before implementation begins
- Track progress as commits are pushed

## What Changes

1. **Update `initWorkflow`** to create a draft PR after branch creation
2. **Initial commit** with proposal.md and tasks.md scaffolded
3. **Push branch** to remote before creating PR
4. **Create draft PR** with proposal as body
5. **Update `speclife_submit`** to mark existing PR as ready (instead of creating new)
6. **Add config option** `createDraftPR: true` (default) to opt-out if desired

## New Flow

```
speclife_init
├─→ Create worktree + branch
├─→ Scaffold proposal.md, tasks.md
├─→ Initial commit: "spec: add {changeId} proposal"
├─→ Push to origin
├─→ Create draft PR with proposal
└─→ Return PR URL

[implement code, commits pushed to same PR]

speclife_submit
├─→ Final commit (if changes)
├─→ Push
├─→ Mark PR ready for review (gh pr ready)
├─→ Archive change
└─→ Return PR URL

speclife_merge (unchanged)
```

## Impact

- Affected code:
  - `packages/core/src/workflows/init.ts` - Add PR creation
  - `packages/core/src/workflows/submit.ts` - Handle existing PR
  - `packages/core/src/config.ts` - Add `createDraftPR` option
  - `packages/mcp-server/src/tools/init.ts` - Return PR URL
