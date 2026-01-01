## 1. Test Infrastructure
- [x] 1.1 Create test helper utilities (temp dir management, mock factories)
- [x] 1.2 Add vitest config files to each package if needed

## 2. Core Adapter Tests
- [x] 2.1 `git-adapter.test.ts` - createBranch, checkout, commit, push, worktree ops
- [ ] 2.2 `github-adapter.test.ts` - PR CRUD, merge, status (mock Octokit)
- [x] 2.3 `openspec-adapter.test.ts` - scaffold, read, archive operations
- [ ] 2.4 `environment-adapter.test.ts` - detect env, bootstrap strategies

## 3. Core Workflow Tests
- [x] 3.1 `init.test.ts` - changeId validation, branch creation, file scaffolding
- [x] 3.2 `status.test.ts` - state detection, formatted output
- [ ] 3.3 `submit.test.ts` - commit flow, PR creation, archiving
- [ ] 3.4 `merge.test.ts` - PR merge, branch cleanup, worktree removal

## 4. Config Tests
- [x] 4.1 `config.test.ts` - loading, validation, defaults, env overrides

## 5. MCP Tool Tests
- [ ] 5.1 Tool schema validation tests
- [ ] 5.2 Tool handler integration tests (mocked core)

## 6. CI Integration
- [ ] 6.1 Verify tests pass in GitHub Actions
- [ ] 6.2 Remove `--passWithNoTests` flag once tests exist
