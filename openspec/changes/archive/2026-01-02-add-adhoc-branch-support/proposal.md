# Add Resilient Ad-hoc Branch Support

## What

Enhance `/speclife ship`, `/speclife land`, and add `/speclife sync` to support ad-hoc branches that weren't created via `/speclife start`. This enables completing the change lifecycle for:
- Branches created manually by developers
- PRs from external contributors
- PRs from other team members
- Dependabot/Renovate PRs
- Quick hotfixes

## Why

Currently, speclife commands assume the full workflow was used (`/speclife start` → worktree + proposal). In practice:
1. Not everyone on a team will use speclife
2. External contributors don't have access to speclife
3. Quick fixes often bypass the formal workflow
4. Automated PRs (Dependabot) don't use speclife

A good developer tool should **meet users where they are** and handle real-world messiness.

## How

### Branch Type Detection

Add a detection step at the start of `ship` and `land` commands:

| Branch Type | Detection | Behavior |
|-------------|-----------|----------|
| **spec branch** | `spec/*` prefix + worktree exists | Full workflow (validate, archive, etc.) |
| **ad-hoc branch** | Any non-main branch without worktree | Simplified workflow (skip OpenSpec steps) |

### `/speclife ship` Changes

For ad-hoc branches:
- Skip `openspec validate` and `/openspec-archive`
- Infer commit type from branch name or existing commits
- Still: stage, commit, push, create PR

### `/speclife land` Changes

- Support landing by PR number: `/speclife land` or `/speclife land #42`
- Skip worktree cleanup for ad-hoc branches
- Still: check PR status, merge, switch to main, trigger release

### New `/speclife sync` Command

Sync current branch with latest main:
- Fetch latest
- Rebase onto main (or merge based on config)
- Handle conflicts with guidance

## Scope

### In Scope
- Update `ship.md` for ad-hoc branch support
- Update `land.md` for ad-hoc branch + PR number support
- Create new `sync.md` command
- Add conflict handling guidance
- **Optimize command file structure** for progressive disclosure (reduce verbosity)

### Out of Scope
- Draft PR support
- Fork PR handling
- Revert command
- Batch PR landing

## Command File Optimization

Current command files are too verbose (300+ lines). Restructure with progressive disclosure:

### Problem
- AI processes entire file upfront even when 80% isn't relevant
- High token usage
- Hard to maintain

### Solution
Restructure each command file with clear priority sections:

```
# Command Name

## TL;DR (10-15 lines)
Quick summary - always read

## Mode Detection  
Decision tree - determines which path

## Core Steps
Condensed workflow for detected mode

---
<!-- REFERENCE - Read only when needed -->

## Appendix: Examples
## Appendix: Error Handling
## Appendix: Edge Cases
```

### Benefits
- Lines to process: 300+ → 50-80
- Context relevance: 20% → 80%  
- Easier maintenance

## Success Criteria

1. `/speclife ship` works on any feature branch (with or without worktree)
2. `/speclife land` can merge any PR by number from main
3. `/speclife sync` updates branch from main with clear conflict guidance
4. Existing spec-branch workflow still works unchanged

