## Why

When SpecLife creates a worktree, the worktree isn't ready to build because dependencies aren't installed. Currently this requires manual `npm install` which breaks the seamless AI-driven workflow.

The solution needs to be **language-agnostic** because SpecLife should work with any project (Node.js, Python, Go, Rust, etc.), not just Node.js projects.

Different ecosystems handle dependencies differently:
- **Node.js:** `node_modules/` per project (npm, yarn, pnpm)
- **Python:** Virtual environments `.venv/` (pip, poetry, uv)
- **Go/Rust:** Global cache (no worktree setup needed)
- **Ruby:** `vendor/bundle/` (bundler)

An adapter pattern allows SpecLife to handle each ecosystem appropriately while remaining extensible.

## What Changes

1. **New adapter interface:** `EnvironmentAdapter` in `packages/core/src/adapters/`
2. **Built-in adapters:** Node.js, Python, Go, Rust (expandable)
3. **Detection system:** Auto-detect project environment(s) from marker files
4. **Bootstrap strategies:** `symlink` (fast), `install` (isolated), `none`
5. **Config extension:** Allow per-environment overrides in `.specliferc.yaml`
6. **Init workflow update:** Call environment bootstrap after worktree creation

## Impact

- Affected specs: `openspec/specs/core/spec.md` (new adapter requirement)
- Affected code:
  - `packages/core/src/adapters/` (new environment adapters)
  - `packages/core/src/workflows/init.ts` (bootstrap integration)
  - `packages/core/src/config.ts` (new config options)
