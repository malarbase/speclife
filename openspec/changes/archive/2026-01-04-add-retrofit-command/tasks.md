# Tasks: Add Retrofit Command and Dynamic Command Discovery

## 1. Create Retrofit Slash Command
- [x] 1.1 Create `openspec/commands/speclife/retrofit.md` with workflow definition
- [x] 1.2 Add `packages/cli/templates/commands/retrofit.md` for distribution
- [x] 1.3 Document prerequisites (must be on main, must have changes)
- [x] 1.4 Define error handling for edge cases

## 2. Implement Dynamic Command Discovery
- [x] 2.1 Add `readdir` import to `packages/cli/src/index.ts`
- [x] 2.2 Replace hardcoded command list in init workflow with dynamic discovery
- [x] 2.3 Replace hardcoded command list in configureEditorSymlinks with dynamic discovery
- [x] 2.4 Test that new commands are automatically picked up

## 3. Update Ship Command Workflow
- [x] 3.1 Update `packages/cli/templates/commands/ship.md` with two-commit workflow
- [x] 3.2 Update `openspec/commands/speclife/ship.md` with two-commit workflow
- [x] 3.3 Document: commit implementation before archive, commit archive after

## 4. Testing
- [x] 4.1 Rebuild CLI package
- [x] 4.2 Run `speclife init --force` to verify symlinks created
- [x] 4.3 Verify retrofit command appears in `.cursor/commands/`

