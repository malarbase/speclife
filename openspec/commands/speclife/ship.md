---
name: /speclife/ship
id: speclife-ship
category: SpecLife
description: Commit changes, push to remote, and create a PR for review.
---
# /speclife ship

Create a PR from your current branch. Works with spec branches and ad-hoc branches.

## TL;DR

```
/speclife ship           # Ship current branch
/speclife ship --draft   # Create as draft PR
```

**Quick flow:**
1. Detect branch type (spec vs ad-hoc)
2. For spec branches: validate + archive spec
3. Stage, commit, push
4. Create/update PR

## Mode Detection

```bash
BRANCH=$(git branch --show-current)
```

| Branch | Type | Behavior |
|--------|------|----------|
| `spec/*` + worktree exists | **Spec** | Full workflow with OpenSpec |
| Any non-main | **Ad-hoc** | Simplified (skip spec steps) |
| `main` | **Error** | Cannot ship from main |

## Core Steps

### 1. Spec Branch Only
If spec branch detected:
- Run `openspec validate <change-id>`
- Archive: `/openspec-archive <change-id>`
- Read proposal.md for commit message

### 2. Ad-hoc Branch Only
- Infer commit type from branch name (`fix/*` → `fix:`, `feat/*` → `feat:`)
- Ask user for commit message if needed

### 3. All Branches
```bash
git add -A
git commit -m "<type>: <description>"  # if uncommitted changes
git push -u origin <branch>
```

### 4. Create PR
```bash
# Check if PR exists
gh pr view --json url 2>/dev/null

# If not, create
gh pr create --fill --base main
# Or: gh pr create --fill --base main --draft
```

### 5. Report
```
✓ Committed: "feat: description"
✓ Pushed to origin/<branch>
✓ Created PR #42: <url>

Next: After approval, run /speclife land
```

---

<!-- REFERENCE SECTIONS - Read only when needed -->

## Appendix: Commit Type Inference

| Branch Pattern | Commit Type |
|----------------|-------------|
| `fix/*`, `bugfix/*`, `hotfix/*` | `fix:` |
| `feat/*`, `feature/*` | `feat:` |
| `docs/*` | `docs:` |
| `refactor/*` | `refactor:` |
| `chore/*` | `chore:` |
| Other | Ask user |

## Appendix: Error Handling

**Cannot ship from main:**
```
❌ Cannot ship from main. Create a branch first.
```

**No changes:**
```
❌ No changes to ship. Working directory clean.
```

**Spec validation failed:**
```
❌ Spec validation failed:
   - proposal.md: Missing "What" section
Fix issues and retry, or use --skip-validation
```

**PR already exists:**
```
ℹ️ PR #43 already exists. Pushing updates...
✓ Updated PR #43
```

## Appendix: Examples

**Spec branch:**
```
User: /speclife ship

Agent:
ℹ️ Spec branch: spec/add-oauth-login
✓ Validated spec
✓ Archived to openspec/changes/archive/
✓ Committed: "feat: add OAuth login"
✓ Created PR #42
```

**Ad-hoc branch:**
```
User: /speclife ship

Agent:
ℹ️ Ad-hoc branch: fix/login-bug
✓ Committed: "fix: resolve login redirect"
✓ Created PR #43
```
