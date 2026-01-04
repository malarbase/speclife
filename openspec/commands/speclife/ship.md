---
name: /speclife-ship
id: speclife-ship
category: SpecLife
description: Commit changes, push to remote, and create a PR for review.
---
**Guardrails**
- Execute immediately—do not ask for confirmation
- Detect branch type: `spec/*` = full OpenSpec workflow, other non-main = ad-hoc, `main` = error
- STOP after PR created—do NOT auto-invoke `/speclife land`

**Steps**
1. For spec branches: run `openspec validate <id>`, commit changes, invoke `/openspec-archive`, commit archive.
2. For ad-hoc branches: infer commit type from branch name (`fix/*` → `fix:`, `feat/*` → `feat:`), ask if ambiguous.
3. Push branch: `git push -u origin <branch>`.
4. Create/update PR: `gh pr create --fill --base main` (or `--draft` if requested).
5. Report: commits made, branch pushed, PR URL. Next: `/speclife land` after approval.

**Reference**
- Commit type inference: fix/bugfix/hotfix → `fix:`, feat/feature → `feat:`, docs → `docs:`, refactor → `refactor:`, chore → `chore:`
- If PR exists, push updates it automatically
