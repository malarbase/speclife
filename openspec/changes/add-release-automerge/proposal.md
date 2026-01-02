# Add Auto-Merge for Release PRs

## Summary

Enable GitHub's auto-merge feature for release PRs, making patch/minor releases fully automatic while keeping major releases under manual control.

## Problem

Currently, the release flow requires manual intervention:
1. `speclife_merge` → creates release PR
2. User must manually merge the release PR
3. Then CI publishes

This adds friction for routine patch/minor releases that don't need human review.

## Solution

Use GitHub's auto-merge API to automatically merge release PRs after CI passes:

- **Patch releases:** Auto-merge enabled ✓
- **Minor releases:** Auto-merge enabled ✓  
- **Major releases:** Manual merge required (safety)

### Flow After Merge

**Patch/Minor:**
```
speclife_merge 
  → Creates release PR
  → Enables auto-merge on PR
  → CI passes
  → PR auto-merges
  → Publish workflow triggers
```

**Major:**
```
speclife_merge
  → Creates release PR (no auto-merge)
  → User reviews
  → User merges manually
  → Publish workflow triggers
```

## Implementation

1. Add `enableAutoMerge()` to GitHubAdapter using GraphQL API
2. Add `autoMerge` option to ReleaseOptions/Result
3. Update releaseWorkflow to call enableAutoMerge when appropriate
4. Pass autoMerge from merge.ts based on bump type

## Requirements

- GitHub repo must have "Allow auto-merge" enabled in settings
- Branch protection with required status checks should be configured
- If auto-merge isn't available, gracefully falls back to manual merge

## Config

Uses existing config - auto-merge is enabled when `release.auto` allows the bump type:

```yaml
release:
  auto:
    patch: true   # auto-merge enabled
    minor: true   # auto-merge enabled  
    major: false  # manual merge required
```

