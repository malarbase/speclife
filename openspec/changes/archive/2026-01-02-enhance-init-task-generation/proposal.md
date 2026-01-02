## Why

Currently `speclife_init` creates empty `tasks.md` scaffolds that users must manually fill in. This is tedious and often results in:
- Vague, high-level tasks that don't guide implementation
- Missing edge cases and error handling tasks
- Inconsistent task granularity

AI can analyze the proposal and codebase to generate well-structured, actionable tasks automatically.

## What Changes

1. **Enhanced init workflow:** Add optional `--generate-tasks` flag
2. **AI task generation:** Analyze proposal + codebase to suggest tasks
3. **Codebase analysis:** Identify affected files, patterns, and conventions
4. **Interactive refinement:** Allow user to accept, modify, or regenerate tasks

## User Experience

```
# Basic init (unchanged)
> speclife_init add-oauth

✓ Created branch: spec/add-oauth
✓ Scaffolded proposal.md (empty)
✓ Scaffolded tasks.md (empty)

# Enhanced init with task generation
> speclife_init add-oauth --generate-tasks "Add OAuth2 authentication with Google and GitHub providers"

Analyzing codebase...
- Found existing auth patterns in packages/core/src/adapters/
- Found MCP tool pattern in packages/mcp-server/src/tools/
- Found test patterns in packages/core/test/

Generating tasks...

✓ Created branch: spec/add-oauth
✓ Generated proposal.md with description
✓ Generated tasks.md with 18 tasks in 5 sections

Generated tasks preview:
## 1. OAuth Adapter
- [ ] 1.1 Create OAuthAdapter interface
- [ ] 1.2 Implement GoogleOAuthProvider
...

Edit tasks.md to refine, or run speclife_implement to start.
```

## Scenarios

| Scenario | Behavior |
|----------|----------|
| No description | Scaffold empty files (current behavior) |
| Description only | Generate proposal, scaffold empty tasks |
| `--generate-tasks` | Generate both proposal and tasks using AI |
| Existing codebase | Analyze patterns, conventions, affected files |
| New project | Use generic best practices for task generation |

## Implementation Approach

### Codebase Analysis
1. Identify project type (monorepo, single package, etc.)
2. Find existing patterns (adapters, workflows, tools)
3. Identify affected areas based on proposal description
4. Extract naming conventions and file structure

### Task Generation Prompt
```
Given:
- Proposal: {description}
- Project structure: {file tree}
- Existing patterns: {adapter examples, workflow examples}
- Affected files: {list}

Generate implementation tasks that:
1. Follow existing codebase patterns
2. Include error handling and edge cases
3. Include tests for each component
4. Are specific and actionable (not vague)
5. Are ordered by dependency
```

### Task Validation
- Ensure tasks reference real files/patterns
- Check task granularity (not too broad, not too specific)
- Verify dependency order makes sense

## Impact

- Modified files:
  - `packages/core/src/workflows/init.ts` (add task generation)
  - `packages/core/src/adapters/claude-cli-adapter.ts` (add task generation prompt)
  - `packages/mcp-server/src/tools/init.ts` (add --generate-tasks option)
  - `packages/core/src/types.ts` (add InitOptions.generateTasks)

## Open Questions

1. Should task generation be the default behavior when description is provided?
2. Should we support regenerating tasks for existing changes?
3. How to handle very large codebases (token limits)?
