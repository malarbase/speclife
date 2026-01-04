# Update License to GPL-3.0

## Summary

Changed the project license from MIT to GPL-3.0 to ensure that derivative works remain open source.

## Motivation

The GPL-3.0 license was chosen to:
- Ensure improvements to SpecLife remain open source
- Provide patent protection for users
- Require source code availability when distributing

## Changes Made

### License Files
- Created `LICENSE` file with full GPL-3.0 text (675 lines)
- Updated `package.json` license field from "MIT" to "GPL-3.0"
- Updated `README.md` with copyright notice and GPL-3.0 reference

### Copyright Headers
Added standard GPL-3.0 copyright headers to main source files:
- `packages/core/src/index.ts`
- `packages/cli/src/index.ts`
- `packages/mcp-server/src/index.ts`

## Impact

- All existing code is now licensed under GPL-3.0
- Contributors must agree to GPL-3.0 terms
- Derivative works must also be GPL-3.0 licensed
