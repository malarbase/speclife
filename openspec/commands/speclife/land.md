---
name: /speclife/land
id: speclife-land
category: SpecLife
description: Merge an approved PR, clean up, and trigger auto-release if applicable.
---
# /speclife land

Merge a PR into main. Works with any PR - yours, team members', or external contributors'.

## TL;DR

```
/speclife land        # Land PR for current branch
/speclife land #42    # Land specific PR by number
```

**Quick flow:**
1. Find PR (from branch or number)
2. Verify ready (approved, CI passing)
3. Squash merge + delete branch
4. Cleanup (worktree if spec branch)
5. Auto-release if applicable

## Mode Detection

```bash
BRANCH=$(git branch --show-current)
```

| Invocation | Mode |
|------------|------|
| `/speclife land` on feature branch | Land PR for current branch |
| `/speclife land #42` | Land specific PR |
| `/speclife land` on main | Prompt for PR number |

## Core Steps

### 1. Find PR
```bash
# By branch
gh pr view --json number,state,reviewDecision

# By number
gh pr view 42 --json number,state,reviewDecision
```

### 2. Check Ready
Required:
- ✓ State: open
- ✓ Reviews: approved (or none required)
- ✓ CI: passing
- ✓ Mergeable: no conflicts

If not ready → report issues and stop.

### 3. Merge
```bash
gh pr merge $PR --squash --delete-branch
```

### 4. Update Local
```bash
git checkout main
git pull origin main
```

### 5. Cleanup
| Type | Action |
|------|--------|
| Spec branch | `speclife worktree rm <change-id>` |
| Ad-hoc branch | `git branch -d <branch>` (if local exists) |
| External PR | Nothing (no local branch) |

### 6. Auto-Release
Read `openspec/speclife.md` for policy. Analyze commit:
- `feat:` → minor
- `fix:` → patch
- `feat!` or `BREAKING CHANGE` → major (manual)

If auto-release enabled for bump type:
```bash
npm version <patch|minor> --no-git-tag-version
npm version <patch|minor> --no-git-tag-version --workspaces
git add -A && git commit -m "chore(release): v<version>"
git push origin main
```

### 7. Report
```
✓ Merged PR #42 (squash)
✓ Cleaned up worktree
✓ Released v1.3.0
```

---

<!-- REFERENCE SECTIONS - Read only when needed -->

## Appendix: Error Handling

**PR not found:**
```
❌ No PR found for branch. Run /speclife ship first.
```

**PR not ready:**
```
❌ PR #42 not ready:
   - Review: changes_requested
   - CI: failing
Address issues and retry.
```

**Merge conflicts:**
```
❌ Merge conflicts detected.
Run /speclife sync, resolve, push, then retry.
```

**On main without PR number:**
```
ℹ️ On main. Which PR to land?
Recent PRs:
  #45 - feat: dark mode (approved ✓)
  #44 - fix: memory leak (needs review)
```

## Appendix: Examples

**Spec branch:**
```
User: /speclife land

Agent:
✓ PR #42 approved, CI passing
✓ Merged (squash)
✓ Removed worktree
✓ Released v1.3.0
```

**By PR number (external):**
```
User: /speclife land #45

Agent:
ℹ️ PR #45 by @contributor
✓ Merged (squash)
✓ Released v1.4.0
Thanks @contributor!
```

**Major version:**
```
User: /speclife land

Agent:
✓ Merged PR #50
ℹ️ Breaking change detected.
   Run /speclife release --major for v2.0.0
```
