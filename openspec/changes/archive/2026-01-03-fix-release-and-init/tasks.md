# Tasks: Fix Release Workflow and Init Commands

## 1. Update `/speclife land` command
- [x] Add version bump step before merge (in feature branch)
- [x] Remove direct push to main
- [x] Add breaking change detection
- [x] Add confirmation prompt for major versions
- [x] Update report message

## 2. Update GitHub Actions workflow
- [x] Change trigger from `chore(release):` to version change detection
- [x] Add version comparison logic
- [x] Update template in CLI package

## 3. Fix `speclife init` command
- [x] Investigate why commands directory is empty
      Root cause: `templates/commands/` directory missing from CLI package
- [x] Check package.json files array
      Issue: Only `dist/` is included, templates would not be published!
- [x] Create `packages/cli/templates/commands/` directory with all command files
- [x] Update `package.json` files array to include `templates/`
- [x] Add error logging when template copy fails (don't silently swallow)
- [x] Add `convert.md` to the list of commands to copy (was added in previous PR)

## 4. Testing
- [ ] Test minor release flow end-to-end
- [ ] Test major release with confirmation
- [ ] Test init creates all command files
