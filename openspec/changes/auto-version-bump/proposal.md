## Why

Currently, after merging a change via `speclife_merge`, developers must manually bump package versions before the CI publish workflow can release new versions to npm. This creates friction:

1. **Publish failures**: The workflow attempts to publish an existing version, causing CI failures
2. **Manual steps**: Developers must remember to run `npm version patch` after each merge
3. **Version conflicts**: If forgotten, the next merge also fails until versions are bumped

Automating version bumps as part of the merge workflow ensures every merged change results in a publishable release.

## What Changes

### 1. AI-Driven Version Bump Determination

Before merging, the AI analyzes the change to determine the appropriate version bump:

```typescript
interface MergeOptions {
  changeId: string;
  method?: 'squash' | 'merge' | 'rebase';
  deleteBranch?: boolean;
  removeWorktree?: boolean;
  versionBump?: 'patch' | 'minor' | 'major' | 'none' | 'auto'; // NEW - default: 'auto'
}
```

When `versionBump: 'auto'` (default), the workflow:

1. Reads the `proposal.md` for the change
2. Fetches the PR diff from GitHub
3. Sends both to AI (using same adapter pattern as `speclife_implement`)
4. AI analyzes and returns recommended bump type with reasoning

### 2. Version Analysis Prompt

The AI receives a structured prompt:

```markdown
Analyze this change and determine the semantic version bump required.

## Proposal
{proposal.md contents}

## Code Changes
{PR diff}

## Guidelines
- **major**: Breaking changes (removed/renamed public APIs, changed behavior)
- **minor**: New features (new exports, new options, additive changes)
- **patch**: Bug fixes, documentation, internal refactors, dependency updates

Respond with JSON:
{
  "bump": "patch" | "minor" | "major",
  "reasoning": "Brief explanation of why this bump type"
}
```

### 3. Merge Workflow Integration

```typescript
// In merge workflow, before executing merge:
async function determineVersionBump(
  changeId: string,
  adapters: { ai: AIAdapter; github: GitHubAdapter; openspec: OpenSpecAdapter }
): Promise<{ bump: 'patch' | 'minor' | 'major'; reasoning: string }> {
  // 1. Read proposal
  const proposal = await adapters.openspec.readProposal(changeId);
  
  // 2. Get PR diff
  const pr = await adapters.github.getPullRequest(changeId);
  const diff = await adapters.github.getPullRequestDiff(pr.number);
  
  // 3. Ask AI to analyze
  const analysis = await adapters.ai.analyzeVersionBump(proposal, diff);
  
  return analysis;
}
```

### 4. MCP Tool Schema

```typescript
{
  name: "speclife_merge",
  inputSchema: {
    properties: {
      changeId: { type: "string", description: "Change ID to merge" },
      versionBump: {
        type: "string",
        enum: ["auto", "patch", "minor", "major", "none"],
        description: "Version bump type. 'auto' uses AI to analyze changes (default)",
        default: "auto"
      }
    }
  }
}
```

### 5. User Confirmation Flow

When AI determines the bump type, return it to the user for confirmation:

```
Merging change 'add-user-auth'...

📊 Version Analysis:
   Recommended: minor
   Reasoning: "Adds new `authenticateUser()` export and `AuthOptions` type. 
              No breaking changes to existing APIs."

Proceed with minor version bump? [Y/n/override]
```

User can:
- Confirm (default)
- Cancel
- Override with explicit bump type

### 6. Execute Version Bump

After merge confirmation:

1. Merge PR to main
2. Pull latest main locally
3. Run `npm version <bump> --workspaces --no-git-tag-version`
4. Commit: `chore: release vX.Y.Z`
5. Push to main
6. CI publishes automatically

## Design Decisions

### Why AI analysis instead of conventional commits?
- Proposal.md contains rich context about intent and scope
- PR diff shows actual code changes
- AI can reason about breaking changes that commit messages might miss
- Works with any commit style, no enforcement needed

### Why analyze before merge, not after?
- User can review and override the suggestion
- Avoids wrong version being published
- Merge and version bump are a single logical operation

### Why confirmation flow?
- Version decisions are important and visible to users
- AI might misjudge edge cases
- User maintains control while getting intelligent defaults

### Why 'auto' as default?
- Removes cognitive load from developers
- AI analysis is fast (single API call)
- Override is always available for edge cases

## Impact

- **Affected specs**: `openspec/specs/mcp-server/spec.md` (merge tool schema)
- **Affected code**:
  - `packages/core/src/workflows/merge.ts` - Add version analysis and bump logic
  - `packages/core/src/adapters/claude-cli-adapter.ts` - Add `analyzeVersionBump()`
  - `packages/core/src/adapters/claude-sdk-adapter.ts` - Add `analyzeVersionBump()`
  - `packages/mcp-server/src/tools/merge.ts` - Update tool schema and response
  - `packages/core/src/types.ts` - Add `VersionAnalysis` type, update `MergeOptions`

## Out of Scope

- Changelog generation (future enhancement)
- Per-package independent versioning (all packages bump together)
- Publishing directly from merge (leave to CI workflow)
- Caching/memoizing AI analysis results
