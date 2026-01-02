# Tasks: Add Resilient Ad-hoc Branch Support

## Implementation Tasks

### 1. Update `/speclife ship` for ad-hoc branches
- [x] 1.1 Add branch type detection section
- [x] 1.2 Add conditional flow for spec vs ad-hoc branches
- [x] 1.3 Add commit type inference for ad-hoc branches
- [x] 1.4 Update examples to show both workflows
- [x] 1.5 Add error handling guidance

### 2. Update `/speclife land` for ad-hoc branches
- [x] 2.1 Add branch type detection section
- [x] 2.2 Support landing by PR number syntax
- [x] 2.3 Add conditional worktree cleanup
- [x] 2.4 Add "land from main" workflow for external PRs
- [x] 2.5 Update examples to show both workflows

### 3. Create `/speclife sync` command
- [x] 3.1 Create `sync.md` with frontmatter
- [x] 3.2 Define sync workflow (fetch, rebase/merge)
- [x] 3.3 Add conflict handling guidance
- [x] 3.4 Add examples

### 4. Update documentation
- [x] 4.1 Update `openspec/speclife.md` to mention ad-hoc support
- [x] 4.2 Update `AGENTS.md` with sync command

### 5. Optimize command file structure
- [x] 5.1 Restructure ship.md with progressive disclosure
- [x] 5.2 Restructure land.md with progressive disclosure
- [x] 5.3 Restructure sync.md with progressive disclosure

### 6. Testing
- [ ] 6.1 Test ship on ad-hoc branch
- [ ] 6.2 Test land on ad-hoc branch
- [ ] 6.3 Test land by PR number
- [ ] 6.4 Test sync command
- [ ] 6.5 Test existing spec workflow still works
