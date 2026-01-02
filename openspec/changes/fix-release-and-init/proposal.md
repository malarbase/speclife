# Fix Release Workflow and Init Commands

## Why

Two issues discovered during the `/speclife land` workflow:

### 1. Release Workflow Pushes Directly to Main

Currently, `/speclife land` bumps version and pushes a release commit directly to main. This:
- Bypasses branch protection rules
- Creates extra commits on main after the feature merge
- Requires a separate release PR for the "proper" flow

### 2. Init Creates Empty Commands Directory

When running `speclife init`, the `openspec/commands/speclife/` directory is created but stays empty.

**Root cause:** The CLI tries to copy templates from `packages/cli/templates/commands/*.md`, but this directory doesn't exist. The catch block silently fails:

```typescript
try {
  const templatePath = join(templatesDir, `${cmd}.md`);
  const content = await readFile(templatePath, 'utf-8');
  await writeFile(destPath, content);
} catch {
  // Template not found - SILENTLY FAILS!
}
```

**Current templates directory:**
```
packages/cli/templates/
  └── speclife-release.yml   ← only this exists
  └── commands/              ← MISSING!
```

## What Changes

### 1. Simplified Release Flow (Minor/Patch)

**Before:**
```
/speclife land
  → Merge PR
  → Bump version on main
  → Push release commit to main  ❌
  → GitHub Actions creates tag
```

**After:**
```
/speclife land
  → Detect commit type (feat:/fix:)
  → Bump version in feature branch
  → Push to feature branch
  → Squash merge PR (version included)
  → GitHub Actions detects version change → creates tag/release
```

Benefits:
- No direct push to main
- Single PR contains feature + version bump
- Cleaner git history (no extra release commits)

### 2. Major Version Confirmation

For breaking changes:
1. Detect `BREAKING CHANGE` or `feat!:` in commit messages
2. Confirm with user: "Breaking change detected. Create v2.0.0?"
3. If confirmed → proceed with same flow
4. If not → abort, suggest `/speclife release --major`

### 3. Update GitHub Actions Workflow

Update `speclife-release.yml` to:
- Trigger on version change detection (not `chore(release):` commit)
- Compare package.json version before/after merge
- Create tag and release if version changed

### 4. Fix Init Command

Ensure `speclife init` properly creates slash command files in `openspec/commands/speclife/`.

## Acceptance Criteria

- [ ] `/speclife land` bumps version in feature branch before merge
- [ ] No direct pushes to main from `/speclife land`
- [ ] Breaking changes prompt for confirmation
- [ ] GitHub Actions creates release on version change
- [ ] `speclife init` creates all slash command files

## Out of Scope

- `/speclife release` command (stays as manual override)
- MCP server changes

## References

- Discussion: Release workflow during `/speclife land` execution

