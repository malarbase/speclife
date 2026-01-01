## Why

When SpecLife creates a worktree, the worktree isn't ready to build because dependencies aren't installed. Currently this requires manual `npm install` which breaks the seamless AI-driven workflow.

The solution needs to be **language-agnostic** because SpecLife should work with any project (Node.js, Python, Go, Rust, etc.), not just Node.js projects.

Different ecosystems handle dependencies differently:
- **Node.js:** `node_modules/` per project (npm, yarn, pnpm)
- **Python:** Virtual environments `.venv/` (pip, poetry, uv)
- **Go/Rust:** Global cache (no worktree setup needed)
- **Ruby:** `vendor/bundle/` (bundler)

An adapter pattern allows SpecLife to handle each ecosystem appropriately while remaining extensible.

### The Monorepo Problem

Symlink-based strategies have a critical issue with **TypeScript monorepos**:

When `node_modules` is symlinked to the main repo, local workspace packages (e.g., `@myorg/core`) also resolve to the main repo's source, not the worktree's. TypeScript follows the real path through symlinks:

```
worktree/node_modules → ../../node_modules
                        └── @myorg/core → ../../packages/core  ← main repo!
```

This causes TypeScript to not see changes made in the worktree. The environment adapter must handle this by either:
1. Using `install` strategy for monorepos (full isolation)
2. Auto-patching `tsconfig.json` with `paths` mappings when using `symlink`

## What Changes

1. **New adapter interface:** `EnvironmentAdapter` in `packages/core/src/adapters/`
2. **Built-in adapters:** Node.js, Python, Go, Rust (expandable)
3. **Detection system:** Auto-detect project environment(s) from marker files
4. **Bootstrap strategies:** `symlink` (fast), `install` (isolated), `none`
5. **Monorepo detection:** Identify workspaces and local package dependencies
6. **TypeScript patching:** Auto-add `paths` mappings for local packages when using `symlink`
7. **Config extension:** Allow per-environment overrides in `.specliferc.yaml`
8. **Init workflow update:** Call environment bootstrap after worktree creation

## Scenarios

| Scenario | Detection | Strategy | Additional Steps |
|----------|-----------|----------|------------------|
| Standalone Node.js | `package.json` only | `symlink` | None |
| Node.js monorepo | `workspaces` in package.json | `install` (default) or `symlink` + tsconfig patch | Patch tsconfig paths if symlink |
| Python (venv) | `pyproject.toml`, `requirements.txt` | `symlink` .venv or `install` | Activate venv |
| Go | `go.mod` | `none` | Global module cache |
| Rust | `Cargo.toml` | `none` | Global target cache |

### Bootstrap Strategy Details

| Strategy | Speed | Isolation | Best for |
|----------|-------|-----------|----------|
| `symlink` | ~1s | Shared deps | Standalone projects |
| `install` | ~10s | Full isolation | Monorepos with local packages |
| `none` | 0s | N/A | Go, Rust (global cache) |

## Impact

- Affected specs: `openspec/specs/core/spec.md` (new adapter requirement)
- Affected code:
  - `packages/core/src/adapters/environment-adapter.ts` (new interface + implementations)
  - `packages/core/src/adapters/index.ts` (export)
  - `packages/core/src/workflows/init.ts` (bootstrap integration)
  - `packages/core/src/config.ts` (new config options)
