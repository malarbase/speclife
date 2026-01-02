# /speclife ship

Archive the spec, commit changes, push to remote, and create a PR for review.

## Usage

```
/speclife ship
```

## Preconditions

- On a `spec/*` branch (in a worktree)
- Implementation complete (may have existing commits from `/openspec-apply`)

## Steps

1. **Validate spec**: Run `openspec validate <change-id>`
   - Ensure proposal.md exists and is well-formed
   - Check tasks.md has tasks defined
   - If validation fails, report errors and stop

2. **Archive spec**: Invoke `/openspec-archive <change-id>`
   - Moves `openspec/changes/<change-id>/` to `openspec/changes/archive/<change-id>/`
   - Updates any references in project.md
   - This ensures the archive is included in the PR

3. **Read proposal**: Extract information for commit message
   - Get the "What" or title from proposal.md
   - Determine commit type (feat, fix, docs, refactor, etc.)

4. **Stage changes**: `git add -A`
   - Include all changes (code, archived spec, any updated docs)

5. **Commit**: `git commit -m "<type>: <description>"`
   - Use conventional commits format
   - Note: User may have prior commits from implementation phase

6. **Push**: `git push -u origin <branch>`
   - Push to remote, set upstream tracking

7. **Create PR**: Use one of these methods (in order of preference):
   - **@github MCP**: If available, use to create PR
   - **gh CLI**: `gh pr create --fill --base main`
   - **Manual**: Provide GitHub URL for manual PR creation

8. **Report**: Show PR URL and next steps

## Commit Message Guidelines

Use conventional commits based on the change type:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

Example: `feat: add OAuth login support`

## Example

```
User: /speclife ship

Agent:
✓ Validated spec for add-oauth-login
✓ Archived spec to openspec/changes/archive/add-oauth-login/
✓ Staged 15 files
✓ Committed: "feat: add OAuth login support"
✓ Pushed to origin/spec/add-oauth-login
✓ Created PR #42: https://github.com/user/repo/pull/42

Next: PR is ready for review. After approval, run `/speclife land` to merge.
```

## Notes

- Archive is done here (not in `/speclife land`) so it's included in the PR
- If PR already exists, push updates to it instead of creating new one
- The `--fill` flag auto-populates PR title/body from commits

