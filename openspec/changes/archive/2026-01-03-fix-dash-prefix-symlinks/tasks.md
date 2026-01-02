# Tasks: Fix Missing Dash-Prefixed Command Symlinks

## Implementation Tasks

- [x] 1. Update `configureEditorSymlinks` function
  - [x] 1.1 Add loop to create dash-prefixed symlinks for each command
  - [x] 1.2 Create relative symlinks: `speclife-{cmd}.md` → `speclife/{cmd}.md`
  - [x] 1.3 Handle existing files (skip or update with --force)
  - [x] 1.4 Add logging for created symlinks

- [x] 2. Test the fix
  - [x] 2.1 Build the CLI package
  - [x] 2.2 Run init in a test project with --force
  - [x] 2.3 Verify symlinks are created correctly
