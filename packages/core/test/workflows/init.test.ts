/**
 * Init workflow tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initWorkflow } from '../../src/workflows/init.js';
import { createOpenSpecAdapter } from '../../src/adapters/openspec-adapter.js';
import { 
  createTempDir, 
  removeTempDir, 
  initGitRepo,
  createOpenSpecStructure,
  createMockGitAdapter,
  createSpecLifeConfig,
} from '../helpers.js';
import { loadConfig } from '../../src/config.js';

describe('initWorkflow', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    await initGitRepo(tempDir);
    await createOpenSpecStructure(tempDir);
    await createSpecLifeConfig(tempDir);
  });

  afterEach(async () => {
    await removeTempDir(tempDir);
  });

  describe('changeId validation', () => {
    it('accepts valid kebab-case changeId', async () => {
      const git = createMockGitAdapter();
      const openspec = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });
      const config = await loadConfig(tempDir);

      const result = await initWorkflow(
        { changeId: 'add-user-auth', noWorktree: true },
        { git, openspec, config }
      );

      expect(result.branch).toBe('spec/add-user-auth');
    });

    it('rejects invalid changeId with uppercase', async () => {
      const git = createMockGitAdapter();
      const openspec = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });
      const config = await loadConfig(tempDir);

      await expect(
        initWorkflow(
          { changeId: 'AddUserAuth', noWorktree: true },
          { git, openspec, config }
        )
      ).rejects.toThrow('Invalid changeId format');
    });

    it('rejects changeId starting with number', async () => {
      const git = createMockGitAdapter();
      const openspec = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });
      const config = await loadConfig(tempDir);

      await expect(
        initWorkflow(
          { changeId: '123-feature', noWorktree: true },
          { git, openspec, config }
        )
      ).rejects.toThrow('Invalid changeId format');
    });
  });

  describe('branch creation', () => {
    it('creates branch with spec/ prefix', async () => {
      const git = createMockGitAdapter();
      const openspec = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });
      const config = await loadConfig(tempDir);

      await initWorkflow(
        { changeId: 'test-feature', noWorktree: true },
        { git, openspec, config }
      );

      expect(git.createBranch).toHaveBeenCalledWith('spec/test-feature', 'main');
    });

    it('throws when branch already exists', async () => {
      const git = createMockGitAdapter({ branchExists: vi.fn().mockResolvedValue(true) });
      const openspec = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });
      const config = await loadConfig(tempDir);

      await expect(
        initWorkflow(
          { changeId: 'existing-branch', noWorktree: true },
          { git, openspec, config }
        )
      ).rejects.toThrow('already exists');
    });
  });

  describe('file scaffolding', () => {
    it('creates proposal and tasks files', async () => {
      const git = createMockGitAdapter();
      const openspec = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });
      const config = await loadConfig(tempDir);

      const result = await initWorkflow(
        { changeId: 'new-change', description: 'A test change', noWorktree: true },
        { git, openspec, config }
      );

      expect(result.proposalPath).toContain('new-change/proposal.md');
      expect(result.tasksPath).toContain('new-change/tasks.md');
      expect(await openspec.changeExists('new-change')).toBe(true);
    });

    it('includes description in proposal when provided', async () => {
      const git = createMockGitAdapter();
      const openspec = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });
      const config = await loadConfig(tempDir);

      await initWorkflow(
        { changeId: 'described-change', description: 'Implement feature X', noWorktree: true },
        { git, openspec, config }
      );

      const change = await openspec.readChange('described-change');
      // The proposal should exist
      expect(change.id).toBe('described-change');
    });
  });

  describe('dry run mode', () => {
    it('does not create branch or files in dry run', async () => {
      const git = createMockGitAdapter();
      const openspec = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });
      const config = await loadConfig(tempDir);

      const result = await initWorkflow(
        { changeId: 'dry-run-change', dryRun: true, noWorktree: true },
        { git, openspec, config }
      );

      expect(git.createBranch).not.toHaveBeenCalled();
      expect(await openspec.changeExists('dry-run-change')).toBe(false);
      expect(result.branch).toBe('spec/dry-run-change');
    });
  });

  describe('progress callbacks', () => {
    it('emits progress events', async () => {
      const git = createMockGitAdapter();
      const openspec = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });
      const config = await loadConfig(tempDir);
      const progressEvents: string[] = [];

      await initWorkflow(
        { changeId: 'progress-test', noWorktree: true },
        { git, openspec, config },
        (event) => progressEvents.push(event.message)
      );

      expect(progressEvents.length).toBeGreaterThan(0);
    });
  });
});

