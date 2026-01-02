# SpecLife Configuration

This file provides context for AI agents using speclife slash commands.

## Commands

<!-- Values auto-detected by /speclife setup from package.json, Makefile, Cargo.toml, etc. -->
- **Test:** `npm test`
- **Build:** `npm run build`
- **Lint:** `npm run lint`
- **Typecheck:** `npm run typecheck`

## Release Policy

- **Auto-release:** patch and minor versions
- **Manual release:** major versions (breaking changes)

## Context Files

When implementing changes, always read:
- `openspec/project.md` - project context and conventions
- `openspec/AGENTS.md` - agent guidelines
- `README.md` - project overview

## Notes

- This file is managed by speclife and populated by `/speclife setup`
- Edit manually to customize release policy or add project-specific context
- Commands are used by `/speclife ship` and `/speclife land` for validation

