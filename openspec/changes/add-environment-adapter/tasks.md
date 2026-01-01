## 1. Core Adapter Interface
- [ ] 1.1 Define `EnvironmentAdapter` interface with detect, bootstrap, cleanup methods
- [ ] 1.2 Create adapter registry with detection priority
- [ ] 1.3 Export from `packages/core/src/adapters/index.ts`

## 2. Built-in Adapters
- [ ] 2.1 Implement Node.js adapter (npm/yarn/pnpm detection, symlink node_modules)
- [ ] 2.2 Implement Python adapter (pip/poetry/uv detection, symlink .venv)
- [ ] 2.3 Implement Go adapter (no-op, uses global GOPATH cache)
- [ ] 2.4 Implement Rust adapter (no-op, uses global cargo cache)

## 3. Configuration
- [ ] 3.1 Add `worktree.bootstrap.strategy` to config schema (symlink|install|none)
- [ ] 3.2 Add `worktree.bootstrap.environments` for per-language overrides
- [ ] 3.3 Update config validation

## 4. Init Workflow Integration
- [ ] 4.1 Add bootstrap step to `initWorkflow` after worktree creation
- [ ] 4.2 Detect environments and run appropriate adapters
- [ ] 4.3 Add `--skip-bootstrap` flag to init options
- [ ] 4.4 Emit progress events during bootstrap

## 5. Cleanup Integration
- [ ] 5.1 Call adapter cleanup before worktree removal (in future merge workflow)

## 6. Verification
- [ ] 6.1 Build passes (`npm run build`)
- [ ] 6.2 Test: Node.js project symlinks node_modules correctly
- [ ] 6.3 Test: Multi-language project bootstraps all environments
