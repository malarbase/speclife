# Add support for Qwencode, Gemini CLI, and Antigravity

## Summary
Expand SpecLife's AI support to include `qwencode` (Qwen-based CLI), `gemini` (Google's Gemini CLI), and `antigravity` (Google's advanced agentic coding assistant). This allows users to choose their preferred AI agent for driving the implementation of specs via the `/openspec-apply` workflow or legacy `speclife_implement` tool.

## Problem
Currently, SpecLife primarily supports `claude` (Anthropic) and `openai`. Users with access to other powerful tools like Qwen (via `qwencode`), Gemini (via CLI), or Antigravity cannot easily leverage them within the SpecLife workflow. `config.ts` has strict validation that rejects these providers.

## Solution
1.  **Configuration:** Update `SpecLifeConfig` to accept `qwencode`, `gemini`, and `antigravity` as valid `aiProvider`s and implementation modes.
2.  **Adapters/Integration:**
    *   **Qwencode:** Implement logic to invoke `qwencode` for task implementation.
    *   **Gemini CLI:** Implement logic to invoke the `gemini` CLI.
    *   **Antigravity:** Add environment detection for Antigravity and appropriate configuration presets.
3.  **CLI:** Update `speclife init` to detect these tools/environments.

## Impact
- Users can use Qwen, Gemini, and Antigravity for spec-driven development.
- `speclife init` becomes smarter at detecting the user's environment.
