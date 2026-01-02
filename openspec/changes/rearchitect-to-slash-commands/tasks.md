## 1. Create Slash Commands (Tracked)

- [x] 1.1 Create `openspec/commands/speclife/setup.md` - Guide agent to discover and populate `openspec/speclife.md`
- [x] 1.2 Create `openspec/commands/speclife/start.md` - Guide agent to create worktree + branch for a new change
- [x] 1.3 Create `openspec/commands/speclife/ship.md` - Guide agent through ship (validate, commit, push, create PR via @github MCP or `gh` CLI)
- [x] 1.4 Create `openspec/commands/speclife/land.md` - Guide agent through land (merge via @github MCP or `gh` CLI, cleanup worktree, archive spec, auto-release based on policy)
- [x] 1.5 Create `openspec/commands/speclife/release.md` - Guide agent through manual release (for major versions)
- [x] 1.6 Create `openspec/commands/speclife/implement.md` - Convenience proxy to `/openspec-apply`

## 2. Rewrite CLI

- [x] 2.1 Add `speclife init` command:
  - [x] Detect editors and display which are configured (Cursor, Claude Code)
  - [x] Create tracked slash commands in `openspec/commands/speclife/`
  - [x] Create editor symlinks (`.cursor/`, `.claude/`)
  - [x] Scaffold `.github/workflows/speclife-release.yml`
  - [x] Create minimal `.specliferc.yaml`
  - [x] Create template `openspec/speclife.md`
  - [ ] Update AGENTS.md (TODO)
  - [x] Make idempotent (if commands exist, just create symlinks)
- [x] 2.2 Add `speclife worktree create <change-id>` command - create worktree + branch
- [x] 2.3 Add `speclife worktree rm <change-id>` command - remove worktree + branch  
- [x] 2.4 Add `speclife worktree list` command - list active worktrees
- [x] 2.5 Update `speclife status` command - show change status
- [x] 2.6 Add `speclife version` command - show version
- [x] 2.7 Remove old `speclife init <change-id>` command (replaced by worktree create)

## 3. Configuration Files

- [x] 3.1 Create minimal `.specliferc.yaml` schema (specDir, git.baseBranch, git.branchPrefix, git.worktreeDir only)
- [ ] 3.2 Remove `aiProvider`, `aiModel`, `github.owner`, `github.repo` from config (kept for backward compat, marked deprecated)
- [x] 3.3 Add auto-detection for specDir (look for openspec/ or specs/)
- [x] 3.4 Add auto-detection for git.baseBranch (from git remote)
- [x] 3.5 Create `openspec/speclife.md` template with TODOs for commands, release policy, context files
- [x] 3.6 Add `openspec/commands/` to tracked files (ensure not gitignored)
- [x] 3.7 Update config loading to use sensible defaults
- [x] 3.8 Create `.github/workflows/speclife-release.yml` template (triggers on `chore(release):` commits, creates tag + release)

## 4. Simplify Core Library

- [x] 4.1 ~~Remove `github-adapter.ts`~~ - Kept with deprecation warning for backward compatibility
- [x] 4.2 Remove `claude-sdk-adapter.ts` - agent IS the AI
- [x] 4.3 Remove `claude-cli-adapter.ts` - agent IS the AI
- [x] 4.4 Remove `cursor-adapter.ts` - not needed
- [x] 4.5 ~~Remove `implement.ts` workflow~~ - Replaced with deprecation stub that suggests `/openspec-apply`
- [x] 4.6 Create `worktree.ts` workflow - worktree management
- [ ] 4.7 Update type exports to remove AI-related types (partial - some types still exported)

**⚠️ NOTE: Build is currently broken due to interface changes. The following need fixing:**
- [ ] 4.8 Fix TypeScript errors in MCP tools (they depend on old interfaces)
- [ ] 4.9 Fix github-adapter to match PullRequest type
- [ ] 4.10 Fix workflow files (submit.ts, merge.ts, release.ts) for updated interfaces

## 5. Update Documentation

- [ ] 5.1 Update `README.md` with new workflow (openspec + speclife together)
- [ ] 5.2 Update `AGENTS.md` to reference both openspec and speclife commands
- [ ] 5.3 Update `openspec/AGENTS.md` to clarify speclife's role as complement
- [ ] 5.4 Document `openspec/speclife.md` purpose and format
- [ ] 5.5 Add deprecation notice to MCP server docs

## 6. Deprecate MCP Server

- [ ] 6.1 Add deprecation notice to all MCP tool descriptions
- [x] 6.2 Log deprecation warning when MCP tools are called (added to github-adapter and implement workflow)
- [ ] 6.3 Update MCP server README with migration guide
- [x] 6.4 Keep MCP tools functional for backward compatibility (stubs created)

**⚠️ NOTE: MCP tools have TypeScript errors that need fixing before they'll compile:**
- [ ] 6.5 Fix `packages/mcp-server/src/tools/init.ts` - uses old InitResult interface
- [ ] 6.6 Fix `packages/mcp-server/src/tools/implement.ts` - uses old ImplementResult interface
- [ ] 6.7 Fix `packages/mcp-server/src/tools/submit.ts` - createGitHubAdapter signature changed
- [ ] 6.8 Fix `packages/mcp-server/src/tools/merge.ts` - createGitHubAdapter signature changed
- [ ] 6.9 Fix `packages/mcp-server/src/tools/release.ts` - createGitHubAdapter signature changed
- [ ] 6.10 Fix `packages/mcp-server/src/tools/list.ts` - createGitHubAdapter signature changed

## 7. Testing

- [ ] 7.1 Test slash commands manually in Cursor (start, ship, land, release)
- [ ] 7.2 Test slash commands manually in Claude Code
- [ ] 7.3 Test new CLI commands work without tokens
- [ ] 7.4 Test `speclife init` creates tracked commands, editor symlinks, and release workflow
- [ ] 7.5 Test slash commands work in worktrees (no re-setup needed)
- [ ] 7.6 Test `gh` CLI fallback when @github MCP is unavailable
- [ ] 7.7 Test auto-release triggers after `/speclife land` for patch/minor
- [ ] 7.8 Verify openspec + speclife workflow end-to-end
- [ ] 7.9 Update existing tests to reflect simplified core
- [ ] 7.10 Fix `packages/core/test/adapters/github-adapter.test.ts` - tests for removed methods

## 8. Cleanup

- [ ] 8.1 Remove `@octokit/rest` from core package dependencies (kept for deprecated github-adapter)
- [ ] 8.2 Remove `@anthropic-ai/sdk` from core package dependencies
- [ ] 8.3 Update package.json descriptions
- [ ] 8.4 Remove unused environment variable references
