## Why

SpecLife currently has no explicit release mechanism. After merging PRs:
- There's no way to control *when* to release
- Users can't batch multiple changes into a single release
- Breaking changes need careful version decisions (especially pre-1.0)

We need `speclife_release` to give users explicit control over versioning and release timing.

## What Changes

1. **New tool:** `speclife_release` for explicit release control
2. **New workflow:** `releaseWorkflow` in `packages/core/src/workflows/release.ts`
3. **AI version analysis:** Use AI to suggest version bump based on changes since last release
4. **Release PR creation:** Create a release PR with version bump, changelog, and git tag

## User Experience

```
# See what would be released
> speclife_release --dry-run

Analyzing changes since v0.1.7...

Commits: 5
- feat: add OAuth support
- fix: handle empty responses
- docs: update README

Suggested version: 0.2.0 (minor - new features)
Files to update: 4 package.json files

# Create the release
> speclife_release --version 0.2.0

✓ Created release branch: release/v0.2.0
✓ Bumped versions in 4 package.json files
✓ Generated CHANGELOG entry
✓ Created PR #42: "Release v0.2.0"

When merged:
- Git tag v0.2.0 will be created
- GitHub Release will be published
- npm packages will be published (via CI)

# Or let AI decide
> speclife_release

AI analysis: Based on commits since v0.1.7:
- 1 feat commit → minor bump
- No breaking changes
Recommended: 0.2.0

Proceed with 0.2.0? [Y/n]
```

## Scenarios

| Scenario | Behavior |
|----------|----------|
| Dry run | Show changes, suggested version, no modifications |
| Explicit version | Use provided version, skip AI analysis |
| AI-decided version | Analyze commits, suggest version, await confirmation |
| Pre-1.0 breaking change | Bump minor (0.1.x → 0.2.0), not major |
| Batch release | Include all merged changes since last release |

## Implementation Approach

### Version Analysis
- Parse commits since last tag using conventional commit format
- Categorize: `feat` → minor, `fix` → patch, `BREAKING CHANGE` → major (or minor if pre-1.0)
- Use AI for ambiguous commits that don't follow conventional format
- Respect pre-1.0 semantics: breaking changes bump minor, not major

### Release Workflow
1. Get latest tag and commits since
2. Analyze commits for version suggestion (AI-assisted)
3. User confirms or provides explicit version
4. Create release branch `release/v{version}`
5. Update all `package.json` versions in workspace
6. Generate CHANGELOG entry from commits
7. Create PR with release title
8. When PR is merged → CI creates tag and publishes

### Integration with publish.yml

`speclife_release` creates the Release PR. When merged:
1. CI workflow creates git tag
2. CI creates GitHub Release  
3. `publish.yml` triggers on release → npm publish

## Impact

- New files:
  - `packages/core/src/workflows/release.ts`
  - `packages/mcp-server/src/tools/release.ts`
- Modified files:
  - `packages/core/src/workflows/index.ts` (export)
  - `packages/mcp-server/src/tools/index.ts` (register)
  - `packages/core/src/types.ts` (types)
  - `packages/core/src/adapters/claude-cli-adapter.ts` (version analysis prompt)

## Compatibility

Works with `auto-github-release`:
- `speclife_merge` only merges (no version logic)
- `speclife_release` creates Release PRs with version bumps
- `publish.yml` handles npm publish when release is created

## Open Questions

1. Should we create the GitHub Release immediately, or wait for PR merge?
2. How to handle release PR conflicts with other PRs?
3. Should `speclife_merge` suggest running `speclife_release` after merge?
