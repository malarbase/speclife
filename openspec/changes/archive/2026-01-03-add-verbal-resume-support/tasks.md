# Tasks: Add Verbal Resume Support

## 1. Update start.md Mode Detection Section

- [x] 1.1. Add resume keywords to mode detection table
- [x] 1.2. Document parsing order (resume → mode → description)
- [x] 1.3. Add examples for each resume keyword variant

## 2. Add Resume Workflow Steps

- [x] 2.1. Add "Check for Resume Intent" step before derive change-id
- [x] 2.2. Add "Validate Proposal Exists" step with error handling
- [x] 2.3. Add conditional "Skip Scaffolding" logic
- [x] 2.4. Update "Report and STOP" section with resume outputs

## 3. Update Examples Section

- [x] 3.1. Add resume examples (with worktree)
- [x] 3.2. Add resume examples (branch-only)
- [x] 3.3. Add "implement" keyword examples
- [x] 3.4. Add error case example (proposal not found)

## 4. Update Documentation

- [x] 4.1. Update Usage section to include resume syntax
- [x] 4.2. Add Notes about resume behavior
- [x] 4.3. Document proposal not found error handling
- [x] 4.4. Add cross-reference to `/openspec-apply`

## 5. Sync Template Copy

- [x] 5.1. Copy changes to `packages/cli/templates/commands/start.md`
- [x] 5.2. Verify both files are in sync

## Validation

- [x] Test resume with existing proposal (worktree mode)
- [x] Test resume with existing proposal (branch-only mode)
- [x] Test resume with non-existent proposal (error case)
- [x] Test "implement" with existing proposal
- [x] Test "implement" with non-existent proposal (fallback to new)
- [x] Test backward compatibility (new proposal creation unchanged)

