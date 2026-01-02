## Why

SpecLife currently has no explicit release mechanism. After merging PRs:
- There's no way to control *when* to release
- Users can't batch multiple changes into a single release
- Breaking changes need careful version decisions (especially pre-1.0)
- Routine patch/minor releases require manual steps

We need `speclife_release` to give users control over versioning while automating routine releases.

## What Changes

1. **New tool:** `speclife_release` for explicit release control
2. **New workflow:** `releaseWorkflow` in `packages/core/src/workflows/release.ts`
3. **Configurable auto-release:** Auto-create release PRs for patch/minor, require manual for major
4. **Version bump flags:** `--major`, `--minor`, `--patch` for explicit control
5. **Release PR creation:** Create a release PR with version bump, changelog, and git tag

## Configuration

```yaml
# .specliferc.yaml
release:
  auto:
    patch: true   # Auto-release for patch bumps (default)
    minor: true   # Auto-release for minor bumps (default)
    major: false  # Require manual release for major (default)
```

Or simpler:
```yaml
release:
  auto: true   # Auto-release all (except major)
  # or
  auto: false  # Manual releases only
```

## User Experience

### After `speclife_merge` (with auto-release)

```
✓ Merged PR #42
✓ Synced main with latest changes

📊 Release Analysis
   Commits since v0.1.7: 3
   Suggested bump: minor (0.1.7 → next)

✨ Auto-release enabled for minor bumps. Creating release PR...

✓ Created release PR: https://github.com/...
   Version: 0.1.7 → 0.2.0

Next: Review and merge the release PR to publish.
```

### When major bump is blocked

```
⚠️ Manual release required (major bump)

Major releases require explicit confirmation. Run:
speclife_release --major
```

### Manual release with `speclife_release`

```
# See what would be released
> speclife_release --dry-run

## Version: 0.1.7 → 0.2.0
Bump type: minor (auto-detected from commits)

### Commits (5)
- ✨ 2 feature(s)
- 🐛 3 fix(es)

---
Run `speclife_release` without `--dry-run` to create the release PR.

# Force a major release
> speclife_release --major

## Version: 0.1.7 → 1.0.0
Bump type: major (forced via --major)

✓ Created release PR: https://github.com/...
```

## Scenarios

| Scenario | Behavior |
|----------|----------|
| Merge with auto-release (patch/minor) | Auto-creates release PR |
| Merge with major bump detected | Blocks, requires manual `--major` |
| `speclife_release --dry-run` | Preview without changes |
| `speclife_release --major` | Force major version bump |
| `speclife_release --minor` | Force minor version bump |
| `speclife_release --patch` | Force patch version bump |
| `speclife_release --version 1.2.3` | Use explicit version |
| Pre-1.0 breaking change | Bumps minor (not major) |

## Implementation Approach

### Version Analysis
- Parse commits since last tag using conventional commit format
- Categorize: `feat` → minor, `fix` → patch, `BREAKING CHANGE` → major (or minor if pre-1.0)
- Respect pre-1.0 semantics: breaking changes bump minor, not major

### Auto-Release Logic (in `speclife_merge`)
1. After merge, analyze commits since last tag
2. Determine suggested bump type
3. Check `release.auto` config for that bump type
4. If allowed → auto-create release PR
5. If blocked (major) → notify user, suggest manual command

### Release Workflow
1. Get latest tag and commits since
2. Analyze commits for version suggestion
3. Apply explicit version/bump flags if provided
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
  - `packages/core/src/config.ts` (release config types)
  - `packages/core/src/workflows/index.ts` (export)
  - `packages/core/src/workflows/merge.ts` (return repoPath)
  - `packages/core/src/types.ts` (release types)
  - `packages/mcp-server/src/tools/index.ts` (register)
  - `packages/mcp-server/src/tools/merge.ts` (auto-release logic)

## Compatibility

Works with `auto-github-release`:
- `speclife_merge` merges PR, optionally auto-releases
- `speclife_release` creates Release PRs with version bumps
- `publish.yml` handles npm publish when release is created

## Design Decisions

### Why auto-release for patch/minor but not major?
- Patch/minor are routine, low-risk releases
- Major releases represent breaking changes that deserve intentional decision
- Users can change defaults via config

### Why bump flags instead of interactive prompts?
- MCP tools work better with explicit flags
- AI assistants can easily use `--major` when needed
- Still supports `--version X.Y.Z` for full control
