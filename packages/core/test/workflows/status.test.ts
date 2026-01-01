/**
 * Status workflow tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { statusWorkflow } from '../../src/workflows/status.js';
import { createOpenSpecAdapter } from '../../src/adapters/openspec-adapter.js';
import { createGitAdapter } from '../../src/adapters/git-adapter.js';
import { 
  createTempDir, 
  removeTempDir, 
  initGitRepo,
  createOpenSpecStructure,
  createMockChange,
  createSpecLifeConfig,
} from '../helpers.js';

describe('statusWorkflow', () => {
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

  describe('change detection', () => {
    it('returns status for existing change', async () => {
      await createMockChange(tempDir, 'test-change', {
        tasks: '## 1. Tasks\n- [ ] 1.1 First task\n- [x] 1.2 Done task\n',
      });
      const git = createGitAdapter(tempDir);
      const openspec = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });

      const status = await statusWorkflow(
        { changeId: 'test-change' },
        { git, openspec }
      );

      expect(status).not.toBeNull();
      expect(status!.change.id).toBe('test-change');
    });

    it('returns null when change does not exist', async () => {
      const git = createGitAdapter(tempDir);
      const openspec = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });

      const status = await statusWorkflow(
        { changeId: 'nonexistent' },
        { git, openspec }
      );

      expect(status).toBeNull();
    });
  });

  describe('task progress', () => {
    it('calculates task completion correctly', async () => {
      await createMockChange(tempDir, 'progress-change', {
        tasks: `## 1. Tasks
- [x] 1.1 Done one
- [x] 1.2 Done two
- [ ] 1.3 Pending
- [ ] 1.4 Also pending
`,
      });
      const git = createGitAdapter(tempDir);
      const openspec = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });

      const status = await statusWorkflow(
        { changeId: 'progress-change' },
        { git, openspec }
      );

      expect(status).not.toBeNull();
      expect(status!.taskSummary.total).toBe(4);
      expect(status!.taskSummary.completed).toBe(2);
      expect(status!.taskSummary.percentage).toBe(50);
    });

    it('handles change with no tasks', async () => {
      await createMockChange(tempDir, 'no-tasks-change', {
        tasks: '## 1. Tasks\n\nNo tasks yet.\n',
      });
      const git = createGitAdapter(tempDir);
      const openspec = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });

      const status = await statusWorkflow(
        { changeId: 'no-tasks-change' },
        { git, openspec }
      );

      expect(status).not.toBeNull();
      expect(status!.taskSummary.total).toBe(0);
      expect(status!.taskSummary.completed).toBe(0);
    });
  });

  describe('branch detection', () => {
    it('detects when on the change branch', async () => {
      await createMockChange(tempDir, 'branch-test');
      const git = createGitAdapter(tempDir);
      const openspec = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });
      
      // Create and checkout the branch
      await git.createBranch('spec/branch-test');

      const status = await statusWorkflow(
        { changeId: 'branch-test' },
        { git, openspec }
      );

      expect(status).not.toBeNull();
      expect(status!.currentBranch).toBe('spec/branch-test');
      expect(status!.onBranch).toBe(true);
    });

    it('detects when not on the change branch', async () => {
      await createMockChange(tempDir, 'not-on-branch');
      const git = createGitAdapter(tempDir);
      const openspec = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });

      const status = await statusWorkflow(
        { changeId: 'not-on-branch' },
        { git, openspec }
      );

      // We're on main/master, not spec/not-on-branch
      expect(status).not.toBeNull();
      expect(status!.onBranch).toBe(false);
    });
  });
});
