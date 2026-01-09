# Tasks

## 1. Create Antigravity Configurator
- [x] 1.1 Create `packages/core/src/configurators/antigravity.ts` extending `EditorConfigurator`
- [x] 1.2 Set `configDir` to `.agent`, `id` to `antigravity`, `name` to `Antigravity`
- [x] 1.3 Implement `configure()` to create individual symlinks at `.agent/workflows/speclife-<cmd>.md`
- [x] 1.4 Implement `unconfigure()` to remove the symlinks
- [x] 1.5 Set `supportsDashPrefix` to `false` (dash-prefix IS the primary format)

## 2. Register Configurator
- [x] 2.1 Export `AntigravityConfigurator` from `packages/core/src/configurators/index.ts`
- [x] 2.2 Register in `initializeEditorRegistry()`

## 3. Add Unit Tests
- [x] 3.1 Add test for `AntigravityConfigurator.configure()` in `packages/core/test/`
- [x] 3.2 Add test for `AntigravityConfigurator.unconfigure()`
- [x] 3.3 Add test for `isConfigured()` detection

## 4. Validation
- [x] 4.1 Run `npm run build` and fix any type errors
- [x] 4.2 Run `npm test` and ensure all tests pass
- [x] 4.3 Manual test: `speclife init --tools antigravity`
