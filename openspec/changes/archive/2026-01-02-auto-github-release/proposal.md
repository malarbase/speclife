## Why

Currently, after merging PRs there's no automated release pipeline. We need:
1. A CI pipeline to publish to npm when releases are created
2. Clean separation between merge workflow (developer) and release pipeline (CI)

**Note:** Version bumping and release PR creation is handled by `speclife_release` (separate change). This change only sets up the publish-on-release pipeline.

## What Changes

### 1. Simplify Merge Workflow

Remove ALL version/release logic from `speclife_merge`. It now only:
- Merges the PR
- Syncs main branch locally
- Cleans up worktree/branch

```typescript
export interface MergeOptions {
  changeId: string;
  method?: 'squash' | 'merge' | 'rebase';
  deleteBranch?: boolean;
  removeWorktree?: boolean;
  // No version/release options - handled by speclife_release
}

export interface MergeResult {
  pullRequest: PullRequest;
  mainSynced: boolean;
  branchDeleted: boolean;
  worktreeRemoved: boolean;
  worktreePath?: string;
}
```

### 2. Add Publish Workflow

Create `.github/workflows/publish.yml` that runs when a GitHub Release is published:

```yaml
name: Publish
on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
      - run: npm ci && npm run build
      - run: npm publish --workspaces --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Flow

```
Developer workflow (speclife):
  speclife_merge → merge PR, cleanup

Release workflow (speclife_release - separate change):
  speclife_release → create Release PR with version bump

Publish workflow (GitHub Actions):
  Release PR merged → GitHub Release created → npm publish
```

## Design Decisions

### Why not use release-please?
- release-please auto-creates Release PRs based on commits
- This conflicts with `speclife_release` which gives users explicit control
- We want: user decides WHEN and WHAT version to release

### Why separate publish from release?
- `speclife_release` creates the Release PR and tags
- GitHub Actions handles npm publish (needs secrets, CI-appropriate)
- Clean separation: speclife = workflow, CI = publishing

## Impact

- **Remove from core:**
  - `bumpVersion()`, `analyzeVersionBump()`, `generateReleaseNotes()`
  - `createRelease()`, `createTag()` from GitHubAdapter
  - Version-related types and options

- **Add:**
  - `.github/workflows/publish.yml` — publish on release

- **Keep:**
  - Basic merge workflow (merge PR, sync main, cleanup)

## Compatibility

This change is designed to work WITH `add-release-tool`:
- `speclife_merge` only merges
- `speclife_release` (future) creates Release PRs
- `publish.yml` handles npm publish

## Out of Scope

- Version bumping (handled by `speclife_release`)
- Release PR creation (handled by `speclife_release`)
- Changelog generation (handled by `speclife_release`)
