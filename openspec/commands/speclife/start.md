# /speclife start

Create a new worktree and branch for a change, optionally scaffolding the proposal.

## Usage

```
/speclife start <description>    # With description (preferred)
/speclife start                  # Without description (prompts for input)
```

## Goal

Set up an isolated workspace for a new change with proper git branch.

## Steps

### If description is provided:

1. **Derive change-id**: Convert description to kebab-case
   - "Add user authentication" → `add-user-auth`
   - Prefix with verb: add-, fix-, update-, remove-, refactor-
   - Keep it short (3-5 words max)

2. **Create worktree**: Run `speclife worktree create <change-id>`
   - Creates worktree at `worktrees/<change-id>/`
   - Creates branch `spec/<change-id>`

3. **Scaffold proposal**: Invoke `/openspec-proposal` with the description
   - Creates `openspec/changes/<change-id>/proposal.md`
   - Creates `openspec/changes/<change-id>/tasks.md`

4. **Report**: Tell the user the worktree location and next steps

### If no description provided:

1. **Ask user**: Request a change-id or description

2. **Create worktree**: Run `speclife worktree create <change-id>`

3. **Suggest next step**: "Run `/openspec-proposal` to create the spec"

## Example

```
User: /speclife start "Add OAuth login support"

Agent:
✓ Derived change-id: add-oauth-login
✓ Created worktree at worktrees/add-oauth-login/
✓ Created branch spec/add-oauth-login
✓ Scaffolded proposal at openspec/changes/add-oauth-login/

Next: The proposal has been created. Review and edit it, then run `/openspec-apply` to implement.
```

## Naming Conventions

- Use kebab-case for change-id
- Prefix with action verb: `add-`, `fix-`, `update-`, `remove-`, `refactor-`
- Keep it descriptive but concise
- Examples:
  - `add-user-auth`
  - `fix-login-redirect`
  - `update-api-docs`
  - `remove-deprecated-endpoint`
  - `refactor-database-layer`

## Notes

- If worktree already exists, report error and suggest using existing one
- The worktree is created from the base branch (usually `main`)
- All work should happen in the worktree directory


