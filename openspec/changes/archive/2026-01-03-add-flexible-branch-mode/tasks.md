# Tasks: Add Flexible Branch Mode

## 1. Update `/speclife start` command
- [x] Add natural language mode detection (triggers: "in a branch", "branch only", etc.)
- [x] Document both worktree and branch-only workflows
- [x] Add tradeoffs table comparing modes
- [x] Reference `/speclife convert` for mode switching

## 2. Create `/speclife convert` command
- [x] Create `convert.md` with "to worktree" and "to branch" modes
- [x] Document prerequisites (must be on spec/* branch)
- [x] Handle uncommitted changes (prompt to commit/stash)
- [x] Include error handling section

## 3. Update `/speclife ship` mode detection
- [x] Change detection from "spec/* + worktree exists" to just "spec/*" prefix
- [x] Add note that spec mode works in either location

## 4. Update `/speclife land` cleanup logic
- [x] Add conditional worktree removal (check if exists first)
- [x] Add detection bash snippet
- [x] Handle spec branch without worktree case

## 5. Add Execution section to all slash commands
- [x] Add "⚡ Execution" section to `start.md`
- [x] Add "⚡ Execution" section to `ship.md`
- [x] Add "⚡ Execution" section to `land.md`
- [x] Add "⚡ Execution" section to `convert.md`
- [x] Add "⚡ Execution" section to `sync.md`
- [x] Add "⚡ Execution" section to `release.md`
- [x] Add "⚡ Execution" section to `setup.md`
- [x] Add "⚡ Execution" section to `implement.md`

## 6. Add explicit STOP boundaries to commands
- [x] Update `start.md` with STOP after scaffolding
- [x] Update `ship.md` with STOP after PR created
- [x] Update `land.md` with STOP after merge

## 7. Testing
- [ ] Verify branch-only workflow end-to-end
- [ ] Verify worktree workflow still works
- [ ] Test mode conversion both directions

