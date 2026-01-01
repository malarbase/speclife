## Why
SpecLife needs the `speclife_submit` tool to complete Phase 2 of the development lifecycle. Currently, users can init a change and check status, but cannot submit their work as a PR. This tool will:
- Stage and commit changes
- Push to remote
- Create a GitHub PR with the proposal as the body
- Archive the change to prevent duplicate submissions

## What Changes
- Add `submitWorkflow` in `packages/core/src/workflows/submit.ts`
- Add `speclife_submit` MCP tool in `packages/mcp-server/src/tools/submit.ts`
- Register the tool in the MCP server
- Export workflow from core package

## Impact
- Affected specs: `openspec/specs/mcp-server/spec.md` (Submit Tool requirement)
- Affected code: `packages/core/src/workflows/`, `packages/mcp-server/src/tools/`
