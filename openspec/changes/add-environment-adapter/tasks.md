## 1. Core Adapter Interface
- [x] 1.1 Define `EnvironmentAdapter` interface with detect, bootstrap, cleanup methods
- [x] 1.2 Create adapter registry with detection priority
- [x] 1.3 Export from `packages/core/src/adapters/index.ts`

## 2. Built-in Adapters
- [x] 2.1 Implement Node.js adapter (npm/yarn/pnpm detection, symlink node_modules)
- [x] 2.2 Implement Python adapter (pip/poetry/uv detection, symlink .venv)
- [x] 2.3 Implement Go adapter (no-op, uses global GOPATH cache)
- [x] 2.4 Implement Rust adapter (no-op, uses global cargo cache)

## 3. Configuration
- [x] 3.1 Add `worktree.bootstrap.strategy` to config schema (symlink|install|none)
- [x] 3.2 Add `worktree.bootstrap.environments` for per-language overrides
- [x] 3.3 Update config validation

## 4. Init Workflow Integration
- [x] 4.1 Add bootstrap step to `initWorkflow` after worktree creation
- [x] 4.2 Detect environments and run appropriate adapters
- [x] 4.3 Add `--skip-bootstrap` flag to init options
- [x] 4.4 Emit progress events during bootstrap

## 5. Cleanup Integration
- [x] 5.1 Call adapter cleanup before worktree removal (in future merge workflow)

## 6. Monorepo Support
- [x] 6.1 Detect monorepo structure (workspaces in package.json, lerna.json, pnpm-workspace.yaml)
- [x] 6.2 Identify local workspace packages that would be affected by symlink resolution
- [x] 6.3 ~~Default to `install` strategy for detected monorepos~~ (Changed: auto-patch instead)
- [x] 6.4 When using `symlink` in monorepo: auto-patch tsconfig.json with `paths` mappings
- [x] 6.5 Support `baseUrl` and `paths` injection for each package's tsconfig

## 7. Verification
- [x] 7.1 Build passes (`npm run build`)
- [ ] 7.2 Test: Node.js project symlinks node_modules correctly
- [ ] 7.3 Test: Multi-language project bootstraps all environments
- [ ] 7.4 Test: TypeScript monorepo with symlink strategy resolves local packages correctly
- [ ] 7.5 Test: TypeScript monorepo with install strategy works without patching
