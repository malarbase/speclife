# Tasks: Add Verbal Resume Support

## 1. Update start.md Mode Detection Section

- [ ] 1.1. Add resume keywords to mode detection table
- [ ] 1.2. Document parsing order (resume → mode → description)
- [ ] 1.3. Add examples for each resume keyword variant

## 2. Add Resume Workflow Steps

- [ ] 2.1. Add "Check for Resume Intent" step before derive change-id
- [ ] 2.2. Add "Validate Proposal Exists" step with error handling
- [ ] 2.3. Add conditional "Skip Scaffolding" logic
- [ ] 2.4. Update "Report and STOP" section with resume outputs

## 3. Update Examples Section

- [ ] 3.1. Add resume examples (with worktree)
- [ ] 3.2. Add resume examples (branch-only)
- [ ] 3.3. Add "implement" keyword examples
- [ ] 3.4. Add error case example (proposal not found)

## 4. Update Documentation

- [ ] 4.1. Update Usage section to include resume syntax
- [ ] 4.2. Add Notes about resume behavior
- [ ] 4.3. Document proposal not found error handling
- [ ] 4.4. Add cross-reference to `/openspec-apply`

## 5. Sync Template Copy

- [ ] 5.1. Copy changes to `packages/cli/templates/commands/start.md`
- [ ] 5.2. Verify both files are in sync

## Validation

- [ ] Test resume with existing proposal (worktree mode)
- [ ] Test resume with existing proposal (branch-only mode)
- [ ] Test resume with non-existent proposal (error case)
- [ ] Test "implement" with existing proposal
- [ ] Test "implement" with non-existent proposal (fallback to new)
- [ ] Test backward compatibility (new proposal creation unchanged)

