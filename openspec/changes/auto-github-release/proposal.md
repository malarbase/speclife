## Why

Currently, `speclife_merge` automatically bumps npm package versions and pushes to main, triggering CI to publish to npm. However, it doesn't create a corresponding GitHub release. This causes version drift:

- npm shows `0.1.7`
- GitHub releases page shows `v0.1.1`

Users checking GitHub for the latest version see outdated information. The release page is also a natural place for changelogs and release notes.

## What Changes

### 1. Add `createRelease` to GitHubAdapter

```typescript
export interface GitHubAdapter {
  // ... existing methods ...
  
  /** Create a GitHub release */
  createRelease(params: {
    tag: string;
    name: string;
    body: string;
    draft?: boolean;
    prerelease?: boolean;
  }): Promise<Release>;
  
  /** Create and push a git tag */
  createTag(tag: string, sha: string, message?: string): Promise<void>;
}

export interface Release {
  id: number;
  url: string;
  tag: string;
  name: string;
}
```

### 2. Update MergeOptions and MergeResult

```typescript
export interface MergeOptions {
  // ... existing options ...
  
  /** Create GitHub release after version bump (default: true when versionBump is not 'none') */
  createRelease?: boolean;
}

export interface MergeResult {
  // ... existing fields ...
  
  /** GitHub release created (if any) */
  release?: Release;
}
```

### 3. Generate Release Notes from Proposal

After merging and bumping version, generate release notes:

```typescript
function generateReleaseNotes(changeId: string, proposal: string, versionAnalysis: VersionAnalysis): string {
  return `## ${changeId}

${extractWhySection(proposal)}

### Version Bump: ${versionAnalysis.bump}

${versionAnalysis.reasoning}

---
*Released via [SpecLife](https://github.com/malarbase/speclife)*`;
}
```

### 4. Merge Workflow Integration

After the version bump commit and push:

```typescript
// In mergeWorkflow, after pushing version bump
if (createRelease && newVersion) {
  // Create signed tag
  await git.createTag(`v${newVersion}`, headSha, `Release v${newVersion}`);
  await git.push('origin', `v${newVersion}`);
  
  // Create GitHub release
  const releaseNotes = generateReleaseNotes(changeId, proposal, versionAnalysis);
  const release = await github.createRelease({
    tag: `v${newVersion}`,
    name: `v${newVersion}`,
    body: releaseNotes,
  });
}
```

### 5. MCP Tool Schema Update

```typescript
{
  name: "speclife_merge",
  inputSchema: {
    properties: {
      // ... existing properties ...
      createRelease: {
        type: "boolean",
        description: "Create GitHub release after version bump (default: true)",
        default: true
      }
    }
  }
}
```

## Design Decisions

### Why create release in the same workflow?
- Single atomic operation: merge → bump → tag → release
- No separate CI job needed
- Version and release are always in sync

### Why use the proposal for release notes?
- Proposal contains human-written context about the change
- "Why" section is already a good summary
- AI reasoning adds technical context

### Why make it configurable?
- Some projects may prefer CI-driven releases
- Allows skipping for hotfixes or partial releases

## Impact

- **Affected code:**
  - `packages/core/src/adapters/github-adapter.ts` - Add `createRelease`, `createTag`
  - `packages/core/src/workflows/merge.ts` - Integrate release creation
  - `packages/core/src/types.ts` - Add `Release` type, update `MergeOptions`/`MergeResult`
  - `packages/mcp-server/src/tools/merge.ts` - Add `createRelease` parameter

## Out of Scope

- Generating changelogs from multiple merged changes
- Release assets (binaries, etc.)
- Pre-release/beta tagging workflows
- Release branch strategies
