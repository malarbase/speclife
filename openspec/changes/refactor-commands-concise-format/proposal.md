# Refactor SpecLife Commands to Concise Format

## What

Simplified all SpecLife slash command files to match the concise format used by OpenSpec commands. Reduced verbose documentation, examples, and appendices to a streamlined structure with three sections: Guardrails, Steps, and Reference.

## Why

The original speclife command files were 150-300+ lines each, containing extensive documentation, bash code examples, error handling appendices, and multiple example conversations. This made them:
- Harder for AI assistants to parse quickly
- Inconsistent with the OpenSpec command format
- More expensive in terms of context tokens
- Redundant with information that can be inferred from the concise steps

The OpenSpec commands (like `/openspec-apply`) use a much more concise format that proved effective—about 20-30 lines covering just the essential guardrails, steps, and reference notes.

## How

Transformed each speclife command file to the three-section format:

1. **Guardrails** - Brief execution rules (execute immediately, requirements, stop conditions)
2. **Steps** - Numbered, single-line action items (no verbose bash blocks)
3. **Reference** - Brief notes and tips (no full appendices)

### Files Changed

| File | Before | After |
|------|--------|-------|
| `setup.md` | 295 lines | 27 lines |
| `start.md` | 272 lines | 20 lines |
| `ship.md` | 165 lines | 22 lines |
| `land.md` | 245 lines | 26 lines |
| `sync.md` | 167 lines | 23 lines |
| `release.md` | 118 lines | 25 lines |
| `retrofit.md` | 307 lines | 25 lines |
| `convert.md` | 162 lines | 29 lines |

Also updated the template files in `packages/cli/templates/commands/` to match.

## Acceptance Criteria

- [x] All speclife command files use Guardrails/Steps/Reference format
- [x] No command file exceeds ~30 lines
- [x] Essential workflow information preserved in Steps section
- [x] Template files in packages/cli/templates/commands/ updated to match

