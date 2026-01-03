# Tasks: Add Worktree Path Validation

## 1. Enhance `/openspec-apply` Command

- [x] 1.1. ~~Add "Step 0: Validate Working Directory Context" before existing steps~~ (Out of scope - OpenSpec owns this)
- [x] 1.2. ~~Add bash script to detect worktree vs main repo~~ (Out of scope)
- [x] 1.3. ~~Add error case when worktree exists but we're in main repo~~ (Out of scope)
- [x] 1.4. ~~Add success output showing working root path~~ (Out of scope)
- [x] 1.5. ~~Document that all file operations must use validated base path~~ (Out of scope)

**Note:** openspec-apply is owned by OpenSpec project, not SpecLife. Validation happens through documentation instead.

## 2. Update `/speclife start` Output

- [x] 2.1. Enhance "Report and STOP" section for worktree mode
- [x] 2.2. Add visual emphasis (🚨 or ⚠️) to critical instructions
- [x] 2.3. Make path requirements explicit with examples
- [x] 2.4. Add "NOT in main repo!" anti-pattern
- [x] 2.5. Ensure clarity about where files will be created

## 3. Add Worktree Guards to AGENTS.md

- [x] 3.1. Create new section: "🚨 CRITICAL: Working with Worktrees"
- [x] 3.2. Document the #1 rule about file edit locations
- [x] 3.3. Add correct vs wrong path examples
- [x] 3.4. Create detection and validation checklist
- [x] 3.5. Add "If You Realize You're in the Wrong Location" guidance
- [x] 3.6. Include verification logic/pseudocode
- [x] 3.7. Explain why this matters (consequences)

## 4. Sync Template Copy

- [x] 4.1. Copy changes from `openspec/commands/speclife/start.md`
- [x] 4.2. Update `packages/cli/templates/commands/start.md`
- [x] 4.3. Verify both files are in sync

## 5. Update OpenSpec Apply Command

- [x] 5.1. ~~Update `.cursor/commands/openspec-apply.md`~~ (Out of scope - OpenSpec owns this)
- [x] 5.2. ~~Update `.claude/commands/openspec-apply.md` if it exists~~ (Out of scope)
- [x] 5.3. ~~Ensure consistency across editor integrations~~ (Out of scope)

**Note:** OpenSpec commands are out of SpecLife's scope. Prevention happens through SpecLife documentation.

## Validation

- [x] Test: `/speclife start` output clearly indicates worktree path requirements
- [x] Test: AGENTS.md section is clear and actionable
- [x] Review: All error messages are helpful and guide to resolution
- [x] Verify: Changes made in worktree, not main repo (practicing what we preach!)

