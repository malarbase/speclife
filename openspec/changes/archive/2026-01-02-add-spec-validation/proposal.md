# Add Spec Validation to Submit

## Why

Currently `speclife_submit` creates a PR without verifying that the spec files are properly formatted and contain all required fields. This can lead to:
- Malformed specs that are hard to process
- Missing required sections in proposals
- Invalid task list formats
- Syntax errors in markdown

Adding validation before submit ensures spec quality and catches issues early.

## What Changes

1. **Add validation step to submit workflow**: Before creating the PR, run `openspec validate` to check spec formatting and structure.

2. **Add ValidationReport type**: Track validation status, errors, and warnings.

3. **Add validation options**: `--skipValidation` to bypass, `--strict` to fail on warnings.

4. **Include validation in PR body**: Show validation status in the PR description.

## Implementation Approach

### Validation Execution
1. Run `openspec validate <changeId> --json --no-interactive`
2. Parse JSON output for errors and warnings
3. If `--strict` is enabled, treat warnings as failures

### Error Handling
- If `openspec validate` command is not available, proceed without validation (with warning)
- If validation fails, abort submit with detailed error message
- If validation passes with warnings, proceed but include warnings in PR description

### PR Description
- Include a summary of validation status (PASS, PASS_WITH_WARNINGS, FAIL)
- List any errors or warnings from `openspec validate` output

## Configuration

No new configuration options required - uses existing `openspec validate` CLI.

## Impact

- **Affected Specs**: None (new feature)
- **Affected Code**: 
  - `packages/core/src/workflows/submit.ts`
  - `packages/core/src/types.ts`
  - `packages/mcp-server/src/tools/submit.ts`

