# /speclife land

Merge an approved PR, clean up the worktree, and trigger auto-release if applicable.

## Usage

```
/speclife land
```

## Preconditions

- PR exists and is approved
- CI checks passing
- On a `spec/*` branch (in a worktree)

## Steps

1. **Check PR status**: Verify PR is ready to merge
   - **@github MCP**: Query PR state
   - **gh CLI**: `gh pr view --json state,reviewDecision,statusCheckRollup`
   - Confirm: approved + checks passing

2. **Merge PR**: Use squash merge (preferred)
   - **@github MCP**: Merge via API
   - **gh CLI**: `gh pr merge --squash --delete-branch`
   - If merge fails (conflicts, etc.), report and stop

3. **Switch to main**: `git checkout main`

4. **Pull latest**: `git pull`
   - Get the merged changes

5. **Cleanup worktree**: `speclife worktree rm <change-id>`
   - Removes `worktrees/<change-id>/` directory
   - Removes local branch (remote branch deleted by merge)

6. **Check release policy**: Read `openspec/speclife.md` for release policy
   - Analyze merged commits to determine version bump type
   - `feat:` → minor bump
   - `fix:` → patch bump
   - `BREAKING CHANGE` or `!` → major bump

7. **Auto-release** (if policy allows):
   - If bump type is in auto-release list (usually patch/minor):
     - Update version in package.json (or equivalent)
     - Update CHANGELOG.md
     - Commit with message `chore(release): vX.X.X`
     - Push and create release PR
   - If bump type requires manual release (usually major):
     - Suggest: "Run `/speclife release --major` to create a major release"

8. **Report**: Confirm merge and any release actions

## Example

```
User: /speclife land

Agent:
✓ PR #42 is approved and checks passing
✓ Merged PR #42 (squash)
✓ Switched to main and pulled latest
✓ Removed worktree worktrees/add-oauth-login/

Release check:
  Commit type: feat (minor bump)
  Release policy: auto-release for patch/minor
  
✓ Updated version to 1.3.0
✓ Created release PR #43: https://github.com/user/repo/pull/43

Done! The feature has been merged. Release PR #43 will auto-merge when approved.
```

## Notes

- Archive was already done in `/speclife ship`, so spec is already in archive folder
- Squash merge keeps history clean (one commit per feature)
- The release PR triggers GitHub Actions to create tag + release when merged
- If auto-release is disabled, the agent will suggest manual release command

