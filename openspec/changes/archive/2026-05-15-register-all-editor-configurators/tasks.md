# Tasks: Register All Editor Configurators in Index

## Implementation
- [x] Add missing `export` declarations for all editor configurator classes in `packages/core/src/configurators/index.ts`
- [x] Add missing `import` declarations for all configurators used in `initializeEditorRegistry()`
- [x] Register all configurators with `EditorRegistry` in alphabetical order inside `initializeEditorRegistry()`

## Validation
- [x] Verified that `packages/core/src/configurators/index.ts` compiles without errors
- [x] Confirmed all 27 configurator files are accounted for in exports and registry initialization
