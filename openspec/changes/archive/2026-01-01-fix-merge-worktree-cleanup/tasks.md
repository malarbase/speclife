## 1. Fix Worktree Detection
- [ ] 1.1 Remove `isInWorktree` check - not needed
- [ ] 1.2 Find worktree by matching `branch` only
- [ ] 1.3 Always attempt cleanup if worktreePath found and removeWorktree=true

## 2. Verification
- [ ] 2.1 Build passes (`npm run build`)
- [ ] 2.2 Test: merge from main repo cleans up worktree
