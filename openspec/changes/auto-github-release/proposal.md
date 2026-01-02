## Why

Currently, `speclife_merge` attempts to bump versions and create releases by pushing directly to main. This approach:

1. **Violates best practices** — Direct pushes to main bypass PR review and branch protection
2. **Fails with protected branches** — Most teams have branch protection enabled
3. **Mixes concerns** — SpecLife is a developer workflow tool, not a release pipeline

The industry standard is to use **GitHub Actions** for automated releases (semantic-release, release-please).

## What Changes

### New Design: Separation of Concerns

| SpecLife (Developer Workflow) | GitHub Action (Release Pipeline) |
|------------------------------|----------------------------------|
| Merge PR | Detect merge to main |
| Analyze version bump (display only) | Bump version in package.json |
| Clean up worktree/branch | Commit version bump |
| Archive change | Create git tag |
| | Create GitHub release |
| | Publish to npm |

### 1. Simplify Merge Workflow

Remove direct version bump and release creation. Keep AI analysis for user information only:

```typescript
export interface MergeOptions {
  changeId: string;
  method?: 'squash' | 'merge' | 'rebase';
  deleteBranch?: boolean;
  removeWorktree?: boolean;
  // versionBump removed - handled by CI
  // createRelease removed - handled by CI
}

export interface MergeResult {
  pullRequest: PullRequest;
  mainSynced: boolean;
  branchDeleted: boolean;
  worktreeRemoved: boolean;
  worktreePath?: string;
  // versionAnalysis removed
  // newVersion removed  
  // release removed
}
```

### 2. Add GitHub Action for Releases

Create `.github/workflows/release.yml` using release-please:

```yaml
name: Release
on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        id: release
        with:
          release-type: node
      
      - uses: actions/checkout@v4
        if: ${{ steps.release.outputs.release_created }}
      
      - uses: actions/setup-node@v4
        if: ${{ steps.release.outputs.release_created }}
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
      
      - run: npm ci && npm run build
        if: ${{ steps.release.outputs.release_created }}
      
      - run: npm publish --workspaces --access public
        if: ${{ steps.release.outputs.release_created }}
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 3. Update MCP Tool Output

```
✓ Merged PR #11: https://github.com/malarbase/speclife/pull/11
✓ Synced main with latest changes
✓ Deleted local branch spec/auto-github-release
✓ Removed worktree at worktrees/auto-github-release

Change complete! CI will handle version bump and release automatically.
```

## Design Decisions

### Why remove version bump from SpecLife?
- **Branch protection compatibility** — Can't push directly to protected main
- **Separation of concerns** — SpecLife manages developer workflow, CI manages releases
- **Industry standard** — semantic-release, release-please, changesets all use this pattern

### Why release-please over semantic-release?
- Creates "Release PR" for visibility before release
- Works well with squash merges (uses PR titles)
- Simpler configuration
- Google-maintained, widely adopted

### Why not keep version analysis in SpecLife?
- It was only useful for the direct-push approach
- Release-please analyzes commits automatically using Conventional Commits
- Reduces complexity and AI API calls

## Impact

- **Remove from core:**
  - `bumpVersion()` function
  - `generateReleaseNotes()` function
  - `analyzeVersionBump()` function
  - `createRelease()` from GitHubAdapter
  - `createTag()` from GitHubAdapter
  - Version-related types and options

- **Add:**
  - `.github/workflows/release.yml` — release-please workflow

- **Keep:**
  - Basic merge workflow (merge PR, sync main, cleanup)

## Out of Scope

- Migrating existing version bump commits
- Per-package independent versioning
- Custom release notes templates
