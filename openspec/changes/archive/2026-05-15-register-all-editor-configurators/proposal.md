# Register All Editor Configurators in Index

## Summary

Updated `packages/core/src/configurators/index.ts` to export and auto-register all existing editor configurator implementations that were previously defined but not wired into the `EditorRegistry`.

## Motivation

Over time, numerous editor configurator files were added to `packages/core/src/configurators/` (e.g., `amazon-q.ts`, `auggie.ts`, `bob.ts`, `cline.ts`, `codex.ts`, etc.), but `index.ts` only exported and registered a small subset (`cursor`, `claude-code`, `vscode`, `windsurf`, `qwen`, `gemini`, `antigravity`). This meant the majority of configurators were unreachable at runtime, and `speclife init` could not detect or configure editors like Amazon Q, Cline, Codex, Continue, and many others.

## Approach

1. Added missing `export` statements for all 20+ configurator classes.
2. Added missing `import` statements for use in `initializeEditorRegistry()`.
3. Added `EditorRegistry.register(new XxxConfigurator())` calls for every configurator in alphabetical order.

## Impact

- All supported editors are now discoverable and configurable via `speclife init`.
- Consistent behavior across the SpecLife ecosystem.
