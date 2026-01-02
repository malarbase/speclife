<!-- OPENSPEC:START -->
# OpenSpec + SpecLife Instructions

These instructions are for AI assistants working in this project.

## Quick Reference

| Task | Command |
|------|---------|
| Create new change | `/speclife start "description"` |
| Create proposal | `/openspec-proposal` |
| Implement tasks | `/openspec-apply` |
| Submit for review | `/speclife ship` |
| Sync with main | `/speclife sync` |
| Merge and release | `/speclife land` |
| Check status | `speclife status` |

## When to Use Each

**OpenSpec commands** (spec management):
- `/openspec-proposal` - Create or edit proposals
- `/openspec-apply` - Implement tasks from specs
- `/openspec-validate` - Check spec completeness
- `/openspec-archive` - Archive completed changes

**SpecLife commands** (git/GitHub automation):
- `/speclife start` - Create worktree + branch
- `/speclife ship` - Commit, push, create PR (works with ad-hoc branches too)
- `/speclife sync` - Update branch with latest main
- `/speclife land` - Merge PR, cleanup, release (supports PR number: `/speclife land #42`)
- `/speclife release` - Manual release (major versions)

## Getting Started

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->
