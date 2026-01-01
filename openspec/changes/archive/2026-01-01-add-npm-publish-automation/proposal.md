## Why

Users need clear documentation on how to install SpecLife, and maintainers need automated publishing to npm when new features are merged. Currently:

1. No installation documentation exists
2. Publishing is manual and error-prone
3. No versioning strategy defined

## What Changes

1. **Documentation:** Add installation section to README with npm link and npm install options
2. **GitHub Actions:** Auto-publish to npm when PRs are merged to main
3. **Versioning:** Use semantic versioning with conventional commits

## Impact

- Affected files:
  - `README.md` - Installation documentation
  - `.github/workflows/publish.yml` - Auto-publish workflow
  - `package.json` files - Version updates

