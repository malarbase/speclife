# Design: AI Provider Expansion

## Context
SpecLife uses `aiProvider` and `implementMode` to determine how to execute the implementation loop (read spec -> write code -> test). Currently valid modes are tightly coupled to Claude.

## Alternatives Considered
1.  **Generic "Custom" Provider:** Allow users to specify a command string for any provider.
    *   *Pros:* Future-proof.
    *   *Cons:* specific prompt engineering or context handling might be needed for each model family.
2.  **First-class Support:** Explicitly support known high-quality coding agents.
    *   *Pros:* Better UX, optimized prompts/flags.
    *   *Selected:* We will do this for Qwencode, Gemini, and Antigravity as requested.

## Architecture Changes

### `packages/core/src/config.ts`
- Update `SpecLifeConfig['aiProvider']` to include `'qwencode' | 'antigravity'`. (Gemini is already there but strictly as a provider, not necessarily linked to the CLI).
- Update `validImplementModes` to include:
    - `'qwencode'` (uses `qwencode` CLI)
    - `'gemini-cli'` (uses `gemini` CLI)
    - `'antigravity'` (native integration/detection)

### `packages/core/src/adapters/environment-adapter.ts`
- Add `detectAntigravity()` check (likely checking ENV vars or specific files).
- Add `detectQwencode()` check (checking binary component).
- Add `detectGeminiCli()` check.

### Implementation Logic (Future Work)
- While the MCP server is deprecated, the `/openspec-apply` logic (which might still rely on core `implement` workflows in the short term or reference them) needs to know how to construct the commands for these new tools.

## Antigravity Specifics
Antigravity is an agentic IDE/environment.
- **Detection:** Check for `ANTIGRAVITY_AGENT` env var or similar (mockable for now).
- **Behavior:** If `antigravity` is detected, `speclife init` should default `implementMode` to `antigravity` (or whatever the preferred mode is, maybe just relying on the agent's native capabilities without an external loop tool).

## Security
- These are local CLI executions, so standard permissions apply.
