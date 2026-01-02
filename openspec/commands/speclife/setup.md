# /speclife setup

Discover project configuration and populate `openspec/speclife.md`.

## Goal

Auto-detect project commands (test, build, lint), publishing configuration, and context files to configure speclife for this project.

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

4. **Detect publish configuration**: Based on project type:

   | Project Type | Detection | Registry | Secret Required |
   |--------------|-----------|----------|-----------------|
   | Node.js | `package.json` with `name` (not private) | npm | `NPM_TOKEN` |
   | Node.js monorepo | `workspaces` in package.json | npm | `NPM_TOKEN` |
   | Rust | `Cargo.toml` with `[package]` | crates.io | `CARGO_REGISTRY_TOKEN` |
   | Python | `pyproject.toml` with `[project]` | PyPI | `PYPI_TOKEN` |
   | Go | `go.mod` | N/A (no central registry) | None |
   | Internal/private | `"private": true` in package.json | N/A | None |

5. **Check for existing workflows**: Look in `.github/workflows/` for:
   - `publish.yml` or similar publish workflow
   - `release.yml` - release workflow

6. **Identify context files**: Look for common documentation:
   - `openspec/project.md` - project context
   - `openspec/AGENTS.md` - agent guidelines
   - `README.md` - project overview
   - `CONTRIBUTING.md` - contribution guidelines

7. **Update speclife.md**: Write discovered values to `openspec/speclife.md`

8. **Report**: Tell the user what was configured and suggest any manual additions

## Publish Workflow Suggestions

If no publish workflow exists, suggest based on project type:

### Node.js (single package)
```yaml
# .github/workflows/publish.yml
name: Publish to npm
on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm test
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Node.js (monorepo with workspaces)
```yaml
# .github/workflows/publish.yml
name: Publish to npm
on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm test
      # Publish each workspace package
      - run: npm publish -w packages/<package-name> --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Rust
```yaml
# .github/workflows/publish.yml
name: Publish to crates.io
on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo test
      - run: cargo publish
        env:
          CARGO_REGISTRY_TOKEN: ${{ secrets.CARGO_REGISTRY_TOKEN }}
```

### Python
```yaml
# .github/workflows/publish.yml
name: Publish to PyPI
on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install build twine
      - run: python -m build
      - run: twine upload dist/*
        env:
          TWINE_USERNAME: __token__
          TWINE_PASSWORD: ${{ secrets.PYPI_TOKEN }}
```

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

## Publish

- **Registry:** npm / PyPI / crates.io / None
- **Workflow:** .github/workflows/publish.yml (exists / TODO)
- **Secret:** NPM_TOKEN / PYPI_TOKEN / CARGO_REGISTRY_TOKEN

## Context Files

When implementing changes, always read:
- `openspec/project.md` - project context and conventions
- `openspec/AGENTS.md` - agent guidelines
- `README.md` - project overview
```

## Example Output

```
User: /speclife setup

Agent:
Detecting project configuration...

✓ Project type: Node.js monorepo (npm workspaces)
✓ Packages: @speclife/core, @speclife/cli, @speclife/mcp-server

Commands detected:
  ✓ Test: npm test
  ✓ Build: npm run build
  ✓ Lint: npm run lint

Workflows:
  ✓ Release: .github/workflows/release.yml
  ✓ Publish: .github/workflows/publish.yml

Context files:
  ✓ openspec/project.md
  ✓ openspec/AGENTS.md
  ✓ README.md

✓ Updated openspec/speclife.md
```

## Notes

- If a command can't be detected, leave it as a TODO for the user
- Don't overwrite user customizations if speclife.md already exists
- This command is idempotent - safe to run multiple times
- If publish workflow is missing, show the appropriate template and remind about secrets


