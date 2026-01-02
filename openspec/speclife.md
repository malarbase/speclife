# SpecLife Configuration

This file provides context for AI agents using speclife slash commands.

## Purpose

This file is read by AI assistants when executing `/speclife` slash commands. It tells them:
- What commands to run for testing, building, linting
- When to auto-release vs require manual release
- What context files to read before implementing

## Commands

<!-- Values auto-detected by /speclife setup from package.json, Makefile, Cargo.toml, etc. -->
- **Test:** `npm test`
- **Build:** `npm run build`
- **Lint:** `npm run lint`
- **Typecheck:** `npm run typecheck`

## Release Policy

Controls how `/speclife land` handles releases after merging:

- **Auto-release:** patch and minor versions
  - Creates release PR automatically
  - Enables auto-merge (if repo settings allow)
- **Manual release:** major versions (breaking changes)
  - Prompts user to run `/speclife release --major`

## Publish

<!-- Auto-detected by /speclife setup -->
- **Registry:** npm
- **Packages:** @speclife/core, @speclife/cli, @speclife/mcp-server (monorepo)
- **Workflow:** `.github/workflows/publish.yml` ✓
- **Secret:** `NPM_TOKEN` (configured in repo settings)

## Context Files

When implementing changes, always read:
- `openspec/project.md` - project context and conventions
- `openspec/AGENTS.md` - agent guidelines
- `README.md` - project overview

## Format Reference

```markdown
# SpecLife Configuration

## Commands
- **Test:** `<command>`
- **Build:** `<command>`
- **Lint:** `<command>`

## Release Policy
- **Auto-release:** <types> (e.g., "patch and minor versions")
- **Manual release:** <types> (e.g., "major versions")

## Context Files
When implementing changes, always read:
- `<file>` - <description>
```

## Notes

- This file is managed by speclife and populated by `/speclife setup`
- Edit manually to customize release policy or add project-specific context
- Commands are used by `/speclife ship` and `/speclife land` for validation
- The format is designed to be both human-readable and AI-parseable
