# Tasks: Add AI Support

## Validation
- [ ] Manual verification using `speclife init` in mocked environments.
- [ ] Unit tests for `config.ts` validation logic.
- [ ] Unit tests for `detect*` functions in `environment-adapter.ts`.

## Implementation Tasks

### Capability: Support Qwencode
- [ ] Update `validImplementModes` in `config.ts` to include `qwencode` <!-- id: config-qwencode -->
- [ ] Add `detectQwencode` to `environment-adapter.ts` <!-- id: detect-qwencode -->
- [ ] Update `speclife init` to suggest Qwencode if detected <!-- id: init-qwencode -->

### Capability: Support Gemini CLI
- [ ] Update `validImplementModes` in `config.ts` to include `gemini-cli` <!-- id: config-gemini -->
- [ ] Add `detectGeminiCli` to `environment-adapter.ts` <!-- id: detect-gemini -->
- [ ] Update `speclife init` to suggest Gemini CLI if detected <!-- id: init-gemini -->

### Capability: Support Antigravity
- [ ] Update `validImplementModes` and `aiProvider` in `config.ts` to include `antigravity` <!-- id: config-antigravity -->
- [ ] Add `detectAntigravity` to `environment-adapter.ts` <!-- id: detect-antigravity -->
- [ ] Update `speclife init` to suggest Antigravity if detected <!-- id: init-antigravity -->
