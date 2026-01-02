## Why
Add unit tests for core workflows, adapters, and MCP tools to improve code quality and catch regressions. Currently, the test scripts run vitest with `--passWithNoTests` because no tests exist.

## What Changes

### Core Package Tests (`packages/core/`)
- **Adapter unit tests** - Mock external services (git, GitHub API, filesystem)
  - `git-adapter.test.ts` - Branch operations, worktree management, status
  - `github-adapter.test.ts` - PR creation, merging, status checks
  - `openspec-adapter.test.ts` - Proposal scaffolding, archiving, reading
  - `environment-adapter.test.ts` - Bootstrap strategies (symlink, install, none)
  
- **Workflow integration tests** - Use temp directories with real git
  - `init.test.ts` - Branch creation, file scaffolding, worktree setup
  - `status.test.ts` - State detection, PR status
  - `submit.test.ts` - Commit, push, PR creation (mocked GitHub)
  - `merge.test.ts` - PR merge, cleanup (mocked GitHub)
  
- **Config tests**
  - `config.test.ts` - Loading, validation, defaults, environment overrides

### MCP Server Tests (`packages/mcp-server/`)
- **Tool schema tests** - Validate input schemas
- **Tool handler tests** - Verify correct workflow invocation with mocked dependencies

## Impact
- Affected specs: All core capabilities
- Affected code: 
  - `packages/core/src/adapters/`
  - `packages/core/src/workflows/`
  - `packages/core/src/config.ts`
  - `packages/mcp-server/src/tools/`

## Testing Strategy
- Use **vitest** with TypeScript
- **Unit tests**: Mock adapters, test pure logic
- **Integration tests**: Real git in temp directories, mocked external APIs
- Aim for ~80% coverage on core workflows
