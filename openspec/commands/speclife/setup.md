# /speclife setup

Discover project configuration and populate `openspec/speclife.md`.

## Goal

Auto-detect project commands (test, build, lint) and context files to configure speclife for this project.

## Steps

1. **Read current config**: Check if `openspec/speclife.md` exists and what's already configured

2. **Detect build system**: Look for project configuration files:
   - `package.json` → Node.js (npm/yarn/pnpm)
   - `Cargo.toml` → Rust (cargo)
   - `go.mod` → Go
   - `Makefile` → Make-based
   - `pyproject.toml` or `setup.py` → Python
   - `build.gradle` or `pom.xml` → Java

3. **Extract commands**: From the detected build system, find:
   - **Test command**: e.g., `npm test`, `cargo test`, `make test`
   - **Build command**: e.g., `npm run build`, `cargo build`, `make build`
   - **Lint command**: e.g., `npm run lint`, `cargo clippy`, `make lint`

4. **Identify context files**: Look for common documentation:
   - `openspec/project.md` - project context
   - `openspec/AGENTS.md` - agent guidelines
   - `README.md` - project overview
   - `CONTRIBUTING.md` - contribution guidelines

5. **Update speclife.md**: Write discovered values to `openspec/speclife.md`

6. **Report**: Tell the user what was configured and suggest any manual additions

## Output

Update `openspec/speclife.md` with discovered configuration:

```markdown
# SpecLife Configuration

## Commands

- **Test:** `<detected-test-command>`
- **Build:** `<detected-build-command>`
- **Lint:** `<detected-lint-command>`

## Release Policy

- **Auto-release:** patch and minor versions
- **Manual release:** major versions (breaking changes)

## Context Files

When implementing changes, always read:
- `openspec/project.md` - project context and conventions
- `openspec/AGENTS.md` - agent guidelines
- `README.md` - project overview
```

## Notes

- If a command can't be detected, leave it as a TODO for the user
- Don't overwrite user customizations if speclife.md already exists
- This command is idempotent - safe to run multiple times


