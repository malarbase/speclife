# Tasks

## 1. Add Qwen Code Configurator
- [x] 1.1 Create `packages/core/src/configurators/qwen.ts` extending `EditorConfigurator`
- [x] 1.2 Set `configDir` to `.qwen`, `id` to `qwen`, and implement `configure()` with symlink to `openspec/commands/speclife/`
- [x] 1.3 Register `QwenConfigurator` in `packages/core/src/configurators/index.ts`
- [x] 1.4 Add unit test in `packages/core/test/configurators/registry.test.ts`

## 2. Add Gemini CLI Configurator
- [x] 2.1 Create `packages/core/src/configurators/gemini.ts` extending `EditorConfigurator`
- [x] 2.2 Set `configDir` to `.gemini`, `id` to `gemini`, and implement `configure()` with symlink
- [x] 2.3 Register `GeminiConfigurator` in `packages/core/src/configurators/index.ts`
- [x] 2.4 Add unit test

## 3. Add Antigravity Configurator
- [x] 3.1 Create `packages/core/src/configurators/antigravity.ts` extending `EditorConfigurator`
- [x] 3.2 Set `configDir` to `.agent`, use `workflows/speclife` path instead of `commands/speclife`
- [x] 3.3 Register `AntigravityConfigurator` in `packages/core/src/configurators/index.ts`
- [x] 3.4 Add unit test

## 4. Update CLI Templates
- [x] 4.1 Add `qwen`, `gemini`, `antigravity` to the editor selection prompt in `speclife init`
      (Auto-registered via EditorRegistry - no manual CLI changes needed)
- [x] 4.2 Update `--tools` flag validation to accept new editor IDs
      (Validation uses EditorRegistry.get() which auto-includes new editors)

## 5. Documentation
- [ ] 5.1 Update README with new supported editors
- [ ] 5.2 Update `openspec/project.md` if needed

## 6. Validation
- [x] 6.1 Run `npm run build` and fix any type errors
- [x] 6.2 Run `npm test` and ensure all tests pass (45 tests in registry.test.ts)
- [x] 6.3 Manual test: `speclife init --tools qwen,gemini,antigravity`
