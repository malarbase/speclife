# Add Editor Support for Qwen Code, Gemini CLI, and Antigravity

## Summary

Add support for three new AI coding tools to SpecLife's editor configurator registry: Qwen Code, Gemini CLI, and Antigravity. These tools will integrate with SpecLife's slash command system by creating the appropriate command file structures in their respective configuration directories.

## Motivation

The OpenSpec project already supports these tools via its slash command configurators. SpecLife, as a complementary tool focused on git/GitHub automation, should maintain parity to provide a consistent developer experience across both systems. Users of Qwen Code, Gemini CLI, and Antigravity should be able to use SpecLife's workflow commands (`/speclife start`, `/speclife ship`, etc.) without manual setup.

## Approach

Follow the existing pattern established by `CursorConfigurator`, `ClaudeCodeConfigurator`, and `WindsurfConfigurator`:

1. **Qwen Code Configurator** (`qwen.ts`)
   - Config directory: `.qwen`
   - Command path: `.qwen/commands/speclife/`
   - Uses symlink pattern (like Cursor)
   - Supports dash-prefix commands: `/speclife-start`, `/speclife-ship`, etc.

2. **Gemini CLI Configurator** (`gemini.ts`)
   - Config directory: `.gemini`
   - Command path: `.gemini/commands/speclife/`
   - Uses symlink pattern
   - May need TOML format adaptation if Gemini uses `.toml` files (verify against OpenSpec implementation)

3. **Antigravity Configurator** (`antigravity.ts`)
   - Config directory: `.agent`
   - Command path: `.agent/workflows/speclife/`
   - Uses symlink pattern
   - Note: Antigravity uses "workflows" not "commands" directory

## Out of Scope

- TOML file generation (SpecLife uses symlinks to markdown source files)
- Global configuration files (SpecLife only handles project-local config)
- AI provider integration (handled separately by the AI adapter)

## Risks

- **Format differences**: If Gemini or Antigravity strictly require TOML format rather than markdown, the symlink approach won't work. Mitigation: Fall back to file copying/generation like OpenSpec does.
- **Directory naming**: Antigravity uses `.agent/workflows/` instead of `.agent/commands/`. Need to verify this works with symlinks.

## Acceptance Criteria

- [ ] `speclife init --tools qwen` configures Qwen Code
- [ ] `speclife init --tools gemini` configures Gemini CLI
- [ ] `speclife init --tools antigravity` configures Antigravity
- [ ] All three tools appear in `speclife init` editor selection
- [ ] Existing tests continue to pass
- [ ] New configurators have unit tests
